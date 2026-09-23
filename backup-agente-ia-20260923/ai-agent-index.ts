import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAgentContext, quotaExceeded, trackUsage } from "../_shared/ai/settings.ts";
import { buildSystemPrompt } from "../_shared/ai/prompt.ts";
import { runAgentLoop } from "../_shared/ai/openrouter.ts";
import { hasInvalidMoney, splitMessageParts } from "../_shared/ai/validate.ts";
import { sendText } from "../_shared/ai/uazapi.ts";
import type { AgentContext, ChatMessagePayload } from "../_shared/ai/types.ts";

const STALL_PATTERN = /(vou verificar|um momento|aguarde|j+í verifico|deixa eu conferir|verificar a disponibilidade|j+í vejo|conferir o valor)/i;

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
    content: "Voc+¬ anunciou que ia verificar mas N+âO executou nenhuma tool. Chame agora a tool necess+íria (ex: find_part) na mesma resposta e s+¦ finalize o turno depois de ter o resultado real em m+úos. Nunca anuncie uma verifica+º+úo futura sem execut+í-la.",
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
}

async function buildHistory(ctx: AgentContext, limit = 20): Promise<ChatMessagePayload[]> {
  const { data: rows } = await ctx.supabase
    .from("messages")
    .select("content, direction, sender_type, media_type, media_url")
    .eq("conversation_id", ctx.conversation.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const recent = (rows ?? []).slice(-limit) as HistoryRow[];

  return recent.map((row, index) => {
    const isAi = row.sender_type === "ai" || (row.sender_type === null && row.direction === "outbound");
    const role: "assistant" | "user" = isAi ? "assistant" : "user";
    const isLast = index === recent.length - 1;
    if (isLast && role === "user" && row.media_url && row.media_type === "image") {
      return {
        role,
        content: [
          { type: "text", text: row.content || "O cliente enviou uma imagem" },
          { type: "image_url", image_url: { url: row.media_url } },
        ],
      };
    }
    if (row.media_type) {
      const label = row.media_type === "audio" || row.media_type === "ptt" ? "um +íudio"
        : row.media_type === "image" ? "uma imagem"
        : row.media_type === "video" ? "um v+¡deo"
        : "um documento";
      return { role, content: `[Cliente enviou ${label}: ${row.content ?? ""}]` };
    }
    return { role, content: row.content };
  });
}

function shouldRespond(ctx: AgentContext): boolean {
  const state = ctx.conversation.ai_state;
  if (ctx.conversation.is_group) return false;
  if (state === "paused" || state === "off") return false;
  if (state === "handed_off" && ctx.agent.post_handoff_behavior !== "continue") return false;
  return true;
}

async function logAi(ctx: AgentContext, payload: Record<string, any>): Promise<void> {
  await ctx.supabase.from("ai_logs").insert({
    tenant_id: ctx.tenantId,
    conversation_id: ctx.conversation.id,
    provider: "openrouter",
    model: ctx.agent.openrouter_model,
    success: payload.success ?? true,
    tools_used: ctx.toolsUsed,
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
  if (!ctx.apiKey) {
    await logAi(ctx, { success: false, error_message: "Sem token OpenRouter configurado" });
    return json({ ok: true, skipped: "no_api_key" });
  }
  if (await quotaExceeded(ctx.supabase, ctx.tenantId, ctx.tokenLimit)) {
    await logAi(ctx, { success: false, error_message: "Cota de tokens excedida" });
    return json({ ok: true, skipped: "quota_exceeded" });
  }

  const startedAt = Date.now();
  const systemPrompt = buildSystemPrompt(ctx);
  const history = await buildHistory(ctx);
  let result = await runWithStallRecovery(ctx, systemPrompt, history, await runAgentLoop(ctx, systemPrompt, history));

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
      systemPrompt + "\n\nATEN+ç+âO: sua +¦ltima resposta citou valores monet+írios que N+âO vieram das tools. Refa+ºa usando APENAS os valores retornados por find_part/build_quote.",
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
    if (!conversationId) return json({ error: "conversation_id obrigat+¦rio" }, 400);

    const ctx = await loadAgentContext(supabase, conversationId);
    if (!ctx) return json({ error: "Conversa ou configura+º+úo do agente n+úo encontrada" }, 404);

    if (body?.action === "claim" || body?.action === "release") {
      if (!userId) return json({ error: "claim/release requer JWT de usu+írio" }, 401);
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

    return await handleRespond(ctx);
  } catch (error) {
    console.error("ai-agent error:", error);
    return json({ ok: true, error: (error as Error).message });
  }
});
