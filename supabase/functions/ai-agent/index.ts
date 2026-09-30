import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAgentContext, quotaExceeded, trackUsage } from "../_shared/ai/settings.ts";
import { buildSystemPrompt } from "../_shared/ai/prompt.ts";
import { runAgentLoop } from "../_shared/ai/openrouter.ts";
import { hasInvalidMoney, splitMessageParts } from "../_shared/ai/validate.ts";
import { sendText } from "../_shared/ai/uazapi.ts";
import { tryCaptureName } from "../_shared/ai/name-capture.ts";
import { transcribeMedia } from "../_shared/ai/media.ts";
import type { AgentContext, ChatMessagePayload } from "../_shared/ai/types.ts";

const STALL_PATTERN = /(vou verificar|um momento|aguarde|já verifico|deixa eu conferir|verificar a disponibilidade|já vejo|conferir o valor)/i;

async function runWithStallRecovery(
  ctx: AgentContext,
  systemPrompt: string,
  history: ChatMessagePayload[],
  first: Awaited<ReturnType<typeof runAgentLoop>>
): Promise<Awaited<ReturnType<typeof runAgentLoop>>> {
  if (first.error || !first.content) return first;
  if (ctx.toolsUsed.length > 0 || !STALL_PATTERN.test(first.content)) return first;

  const nudge: ChatMessagePayload = {
    role: "user",
    content: "Você anunciou que ia verificar mas NÃO executou nenhuma tool. Chame agora a tool necessária (ex: find_part) na mesma resposta e só finalize o turno depois de ter o resultado real em mãos. Nunca anuncie uma verificação futura sem executá-la.",
  };
  const retry = await runAgentLoop(ctx, systemPrompt, [
    ...history,
    { role: "assistant", content: first.content },
    nudge,
  ]);
  return {
    content: retry.error ? first.content : retry.content,
    inputTokens: first.inputTokens + retry.inputTokens,
    outputTokens: first.outputTokens + retry.outputTokens,
    error: first.error,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HistoryRow {
  content: string;
  direction: string;
  sender_type: string | null;
  media_type: string | null;
  media_url: string | null;
  media_transcription?: string | null;
  role?: string;
}

async function buildHistory(ctx: AgentContext, limit = 12): Promise<ChatMessagePayload[]> {
  const { data: rows } = await ctx.supabase
    .from("messages")
    .select("content, direction, sender_type, media_type, media_url, media_transcription")
    .eq("conversation_id", ctx.conversation.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const recent = (rows ?? []).slice(-limit) as HistoryRow[];
  const FULL_KEEP = 6;

  const out: ChatMessagePayload[] = [];

  for (let index = 0; index < recent.length; index++) {
    const row = recent[index];
    const isAi = row.sender_type === "ai" || (row.sender_type === null && row.direction === "outbound");
    const role: "assistant" | "user" = isAi ? "assistant" : "user";
    const isLast = index === recent.length - 1;
    const maxChars = index >= recent.length - FULL_KEEP ? 400 : 160;
    let content = (row.content ?? "").substring(0, maxChars);

    if (row.media_type && row.role !== "assistant") {
      const label = row.media_type === "audio" || row.media_type === "ptt" ? "um áudio"
        : row.media_type === "image" ? "uma imagem"
        : row.media_type === "video" || row.media_type === "ptv" ? "um vídeo"
        : "um documento";
      // Última mídia do cliente: transcreve agora (consome cota do plano) e persiste.
      // Mídias antigas: usa a transcrição já salva (se houver) — nunca re-transcreve.
      if (isLast && role === "user" && row.media_url && !row.media_transcription) {
        const transcription = await transcribeMedia(ctx, row.media_url, row.media_type);
        if (transcription?.text) {
          row.media_transcription = transcription.text;
          await ctx.supabase
            .from("messages")
            .update({ media_transcription: transcription.text })
            .eq("conversation_id", ctx.conversation.id)
            .eq("media_url", row.media_url)
            .is("media_transcription", "null");
        }
      }
      content = row.media_transcription
        ? `[Cliente enviou ${label}: ${row.media_transcription}]`
        : `[Cliente enviou ${label}${content ? `: ${content}` : ""}]`;
    }

    out.push({ role, content });
  }

  return out;
}

function shouldRespond(ctx: AgentContext): boolean {
  const state = ctx.conversation.ai_state;
  if (ctx.conversation.is_group && !ctx.agent.respond_in_groups) return false;
  if (state === "paused" || state === "off") return false;
  if (state === "handed_off" && ctx.agent.post_handoff_behavior !== "continue") return false;
  return true;
}

async function logAi(ctx: AgentContext, payload: Record<string, any>): Promise<void> {
  await ctx.supabase.from("ai_logs").insert({
    tenant_id: ctx.tenantId,
    conversation_id: ctx.conversation.id,
    provider: "openrouter",
    model: ctx.effectiveModel || ctx.agent.openrouter_model,
    success: payload.success ?? true,
    tools_used: ctx.toolsUsed,
    tool_results: ctx.toolResults,
    ...payload,
  });
}

async function handleClaim(ctx: AgentContext, userId: string): Promise<Response> {
  const state = ctx.conversation.ai_state;
  // Pausa a IA ANTES de enviar a mensagem: elimina a janela de race em que
  // uma msg do lead durante o "digitando..." ainda disparava resposta da IA.
  await ctx.supabase
    .from("conversations")
    .update({ ai_state: "paused", assigned_to: userId })
    .eq("id", ctx.conversation.id);
  if (state === "attending" || state === "handed_off") {
    try {
      await sendText(ctx, ctx.agent.handoff_message);
    } catch (err) {
      console.warn("[ai-agent] claim handoff msg failed:", (err as Error).message);
    }
  }
  return json({ ok: true, claimed: true });
}

async function handleRelease(ctx: AgentContext): Promise<Response> {
  // Sem mensagem automatica: o agente analisa o contexto na proxima msg do lead
  await ctx.supabase
    .from("conversations")
    .update({ ai_state: "attending", ai_released_at: new Date().toISOString(), assigned_to: null })
    .eq("id", ctx.conversation.id);
  return json({ ok: true, released: true });
}

function json(body: Record<string, any>, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}

async function handleRespond(ctx: AgentContext): Promise<Response> {
  if (!ctx.agent.active) return json({ ok: true, skipped: "agent_inactive" });
  if (!shouldRespond(ctx)) return json({ ok: true, skipped: `state_${ctx.conversation.ai_state}` });

  // Lock de execução por conversa: uma resposta por vez. Mensagens que chegam
  // durante um atendimento em andamento ficam "pending" e são reprocessadas
  // ao final, com o histórico completo — elimina respostas duplicadas.
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + 120_000).toISOString();
  const runMarker = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: claimed } = await ctx.supabase
    .from("conversations")
    .update({ ai_processing_until: lockUntil, ai_run_marker: runMarker })
    .eq("id", ctx.conversation.id)
    .or(`ai_processing_until.is.null,ai_processing_until.lt.${nowIso}`)
    .select("id")
    .maybeSingle();
  if (!claimed) {
    // Atendimento em andamento: invalida a execução corrente (interrupt) e
    // agenda o reprocessamento com TODAS as mensagens num turno único.
    await ctx.supabase
      .from("conversations")
      .update({
        ai_pending: true,
        ai_run_marker: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      })
      .eq("id", ctx.conversation.id);
    return json({ ok: true, skipped: "already_processing" });
  }

  try {
    return await handleRespondLocked(ctx, runMarker);
  } finally {
    await releaseProcessingLock(ctx);
  }
}

/** Execução foi superada por mensagem mais recente? (interrupt & merge) */
async function isRunStale(ctx: AgentContext, marker: string): Promise<boolean> {
  const { data: c } = await ctx.supabase
    .from("conversations")
    .select("ai_run_marker")
    .eq("id", ctx.conversation.id)
    .limit(1)
    .maybeSingle();
  return (c?.ai_run_marker ?? marker) !== marker;
}

async function releaseProcessingLock(ctx: AgentContext): Promise<void> {
  const { data: pending } = await ctx.supabase
    .from("conversations")
    .update({ ai_processing_until: null, ai_pending: false })
    .eq("id", ctx.conversation.id)
    .eq("ai_pending", true)
    .select("id")
    .maybeSingle();
  if (!pending) return;
  // Chegou mensagem durante o atendimento: reprocessa com o histórico completo
  try {
    void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ conversation_id: ctx.conversation.id }),
    }).then((r) => r.text());
  } catch { /* fire and forget */ }
}

async function handleRespondLocked(ctx: AgentContext, runMarker: string): Promise<Response> {
  if (!ctx.apiKey) {
    await logAi(ctx, { success: false, error_message: "Sem token OpenRouter configurado" });
    return json({ ok: true, skipped: "no_api_key" });
  }
  if (await quotaExceeded(ctx.supabase, ctx.tenantId, ctx.tokenLimit)) {
    await logAi(ctx, { success: false, error_message: "Cota de tokens excedida" });
    return json({ ok: true, skipped: "quota_exceeded" });
  }

  const startedAt = Date.now();
  await tryCaptureName(ctx);
  const systemPrompt = buildSystemPrompt(ctx);
  const history = await buildHistory(ctx);

  // Interrupt: mensagem nova chegou durante o histórico/transcrição — descarta
  // este turno ANTES de gastar LLM; o reprocessamento envia a resposta única.
  if (await isRunStale(ctx, runMarker)) {
    await logAi(ctx, { success: true, error_message: "superseded_antes_do_llm", response_time_ms: Date.now() - startedAt });
    return json({ ok: true, skipped: "superseded_before_llm" });
  }

  let result = await runWithStallRecovery(ctx, systemPrompt, history, await runAgentLoop(ctx, systemPrompt, history));

  // Interrupt: resposta gerada mas mensagem nova chegou — descarta sem enviar
  if (await isRunStale(ctx, runMarker)) {
    await logAi(ctx, {
      success: true,
      error_message: "superseded_resposta_descartada",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      response_time_ms: Date.now() - startedAt,
    });
    return json({ ok: true, skipped: "superseded_after_llm" });
  }

  if (result.error) {
    await logAi(ctx, {
      success: false,
      error_message: result.error,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      response_time_ms: Date.now() - startedAt,
    });
    try {
      await sendText(ctx, ctx.agent.transfer_message);
    } catch { /* sem token de envio: registra e segue */ }
    return json({ ok: true, error: result.error });
  }

  let finalText = result.content;
  if (hasInvalidMoney(finalText, ctx.allowedValues)) {
    const retry = await runAgentLoop(
      ctx,
      systemPrompt + "\n\nATENÇÃO: sua última resposta citou valores monetários que NÃO vieram das tools. Refaça usando APENAS os valores retornados por find_part/build_quote.",
      history
    );
    finalText = retry.content;
    result = { ...retry, inputTokens: result.inputTokens + retry.inputTokens, outputTokens: result.outputTokens + retry.outputTokens };
  }
  if (hasInvalidMoney(finalText, ctx.allowedValues)) {
    finalText = ctx.canonicalQuote ?? ctx.agent.transfer_message;
  }

  const parts = splitMessageParts(finalText);
  let sent = 0;
  // Interrupt: última chance antes de enviar — nunca entrega resposta superada
  if (await isRunStale(ctx, runMarker)) {
    await logAi(ctx, {
      success: true,
      error_message: "superseded_resposta_descartada",
      input_tokens: 0,
      output_tokens: 0,
      response_time_ms: Date.now() - startedAt,
    });
    return json({ ok: true, skipped: "superseded_before_send" });
  }
  for (const part of parts) {
    try {
      await sendText(ctx, part);
      sent++;
    } catch (err) {
      console.error("[ai-agent] send part failed:", (err as Error).message);
      break;
    }
  }

  if (ctx.handoffRequested) {
    await ctx.supabase
      .from("conversations")
      .update({ ai_state: "handed_off", unread_count: 1 })
      .eq("id", ctx.conversation.id);
  }

  await logAi(ctx, {
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    cost: 0,
    response_time_ms: Date.now() - startedAt,
    success: true,
  });
  await trackUsage(ctx.supabase, ctx.tenantId, result.inputTokens, result.outputTokens, 0);

  return json({ ok: true, sent, handoff: ctx.handoffRequested });
}

function isServiceAuth(token: string, serviceKey: string): boolean {
  if (token && serviceKey && token === serviceKey) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;

    if (!isServiceAuth(token, serviceKey)) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData?.user) return json({ error: "Unauthorized" }, 401);
      userId = userData.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const conversationId = body?.conversation_id;
    if (!conversationId) return json({ error: "conversation_id obrigatório" }, 400);

    const ctx = await loadAgentContext(supabase, conversationId);
    if (!ctx) return json({ error: "Conversa ou configuração do agente não encontrada" }, 404);

    if (body?.action === "claim" || body?.action === "release") {
      if (!userId) return json({ error: "claim/release requer JWT de usuário" }, 401);
      const { data: userProfile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();
      if (userProfile?.tenant_id !== ctx.tenantId) return json({ error: "Forbidden" }, 403);
      return body.action === "claim"
        ? await handleClaim(ctx, userId)
        : await handleRelease(ctx);
    }

    if (userId) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();
      if (userProfile?.tenant_id !== ctx.tenantId) return json({ error: "Forbidden" }, 403);
    }

    // Bloqueio de assinatura: vencimento + carência global + prazo extra
    // da empresa — agente de IA não responde até o pagamento ser confirmado
    const { data: subTenant } = await supabase
      .from("tenants")
      .select("subscription_due_date, subscription_extra_days")
      .eq("id", ctx.tenantId)
      .maybeSingle();
    if (subTenant?.subscription_due_date) {
      const { data: asaasCfg } = await supabase
        .from("asaas_config")
        .select("subscription_grace_days")
        .limit(1)
        .maybeSingle();
      const grace =
        (asaasCfg?.subscription_grace_days ?? 7) + (subTenant.subscription_extra_days ?? 0);
      const deadline = new Date(subTenant.subscription_due_date).getTime() + grace * 86400000;
      if (Date.now() > deadline) {
        return json({ ok: true, blocked: "subscription_overdue" });
      }
    }

    return await handleRespond(ctx);
  } catch (error) {
    console.error("ai-agent error:", error);
    return json({ ok: true, error: (error as Error).message });
  }
});
