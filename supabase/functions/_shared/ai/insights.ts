// Insights de IA para o painel de relatórios: a cada ~12h um agente lê as
// estatísticas REAIS do tenant e gera insights acionáveis. O consumo entra
// na cota do tenant (trackUsage com a origem correta do token).
import { trackUsage } from "./settings.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const INSIGHTS_MODEL = "google/gemini-3.1-flash-lite";
const TWELVE_HOURS_MS = 12 * 3_600_000;

async function count(supabase: any, table: string, filters: Record<string, unknown>): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count: c } = await q;
  return c ?? 0;
}

export async function collectStats(supabase: any, tenantId: string): Promise<Record<string, unknown>> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [osTotal, osByStatus, osMonth, customersTotal, customersMonth, events, noShows, convTotal] = await Promise.all([
    count(supabase, "service_orders", { tenant_id: tenantId }),
    supabase.from("service_orders").select("status").eq("tenant_id", tenantId).then((r: any) => r.data ?? []),
    supabase.from("service_orders").select("budget_amount, created_at, completed_at").eq("tenant_id", tenantId).gte("created_at", monthStartIso).then((r: any) => r.data ?? []),
    count(supabase, "customers", { tenant_id: tenantId }),
    count(supabase, "customers", { tenant_id: tenantId }),
    supabase.from("calendar_events").select("status").eq("tenant_id", tenantId).gte("created_at", weekAgoIso).then((r: any) => r.data ?? []),
    Promise.resolve(0),
    count(supabase, "conversations", { tenant_id: tenantId }),
  ]);
  void customersMonth;

  const statusCounts: Record<string, number> = {};
  for (const r of osByStatus) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  const revenueMonth = osMonth.reduce((a: number, o: any) => a + Number(o.budget_amount ?? 0), 0);
  const completedMonth = osMonth.filter((o: any) => o.completed_at);
  const avgHours = completedMonth.length
    ? completedMonth.reduce((a: number, o: any) =>
        a + (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / 3_600_000, 0) / completedMonth.length
    : 0;

  const eventStatuses: Record<string, number> = {};
  for (const e of events) eventStatuses[e.status] = (eventStatuses[e.status] ?? 0) + 1;

  const { data: tx } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("tenant_id", tenantId)
    .gte("created_at", monthStartIso);
  const income = (tx ?? []).filter((r: any) => r.type === "income").reduce((a: number, r: any) => a + Number(r.amount ?? 0), 0);
  const expenses = (tx ?? []).filter((r: any) => r.type === "expense").reduce((a: number, r: any) => a + Number(r.amount ?? 0), 0);

  return {
    periodo: new Date().toISOString().slice(0, 10),
    os: { total: osTotal, por_status: statusCounts, criadas_no_mes: osMonth.length, concluidas_no_mes: completedMonth.length, horas_media_conclusao: Math.round(avgHours * 10) / 10 },
    financeiro: { receita_confirmada_mes: Math.round(income * 100) / 100, despesas_mes: Math.round(expenses * 100) / 100, orcado_no_mes: Math.round(revenueMonth * 100) / 100 },
    clientes: { total: customersTotal },
    agenda: { eventos_7d: events.length, por_status_7d: eventStatuses },
    conversas_whatsapp: convTotal,
  };
}

async function resolveApiKey(supabase: any, tenantId: string): Promise<{ apiKey: string | null; tokenSource: string; model: string }> {
  const [{ data: platform }, { data: entitlement }, { data: agent }] = await Promise.all([
    supabase.from("platform_ai_config").select("openrouter_token, distribution_mode").limit(1).maybeSingle(),
    supabase.from("tenant_ai_entitlements").select("use_platform_token").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    supabase.from("ai_agent_settings").select("openrouter_model, own_api_key").eq("tenant_id", tenantId).limit(1).maybeSingle(),
  ]);
  const covered = platform?.openrouter_token &&
    (platform.distribution_mode === "all"
      ? entitlement?.use_platform_token !== false
      : entitlement?.use_platform_token === true);
  if (covered) return { apiKey: platform.openrouter_token, tokenSource: "platform", model: agent?.openrouter_model || INSIGHTS_MODEL };
  if (agent?.own_api_key) return { apiKey: agent.own_api_key, tokenSource: "own", model: agent?.openrouter_model || INSIGHTS_MODEL };
  return { apiKey: null, tokenSource: "platform", model: INSIGHTS_MODEL };
}

async function generateInsights(apiKey: string, model: string, stats: Record<string, unknown>): Promise<string | null> {
  const prompt =
    "Você é um analista de negócios de uma assistência técnica de celulares. Analise as estatísticas JSON abaixo e escreva de 4 a 6 insights curtos e acionáveis em português do Brasil, um por linha, começando com um emoji. Foque em: resumo do momento, pontos de atenção (filas, gargalos, agendamentos sem confirmação), tendências financeiras e 1-2 sugestões práticas concretas. NÃO invente números que não estejam no JSON. Responda APENAS com as linhas de insight, sem preâmbulo.\n\n" +
    JSON.stringify(stats);
  const resp = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://consertia.app",
      "X-Title": "ConsertIA",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
      temperature: 0.4,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data?.error) {
    console.warn("[insights] LLM failed:", data?.error?.message ?? resp.status);
    return null;
  }
  const text = (data.choices?.[0]?.message?.content ?? "").toString().trim();
  return text || null;
}

/** Gera insights para tenants cuja última análise tem mais de 12h. */
export async function processAiInsights(supabase: any): Promise<number> {
  const { data: tenants } = await supabase.from("tenants").select("id").eq("active", true);
  if (!tenants?.length) return 0;

  let generated = 0;
  for (const tenant of tenants) {
    const { data: last } = await supabase
      .from("ai_insights")
      .select("created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < TWELVE_HOURS_MS) continue;

    const { apiKey, tokenSource, model } = await resolveApiKey(supabase, tenant.id);
    if (!apiKey) continue;

    try {
      const stats = await collectStats(supabase, tenant.id);
      const insights = await generateInsights(apiKey, model, stats);
      if (!insights) continue;
      await supabase.from("ai_insights").insert({
        tenant_id: tenant.id,
        period: new Date().toISOString().slice(0, 7),
        insights,
        stats,
        model,
      });
      await trackUsage(supabase, tenant.id, 800, 200, 0, tokenSource);
      generated++;
    } catch (err) {
      console.warn("[insights] tenant failed:", (err as Error).message);
    }
  }
  return generated;
}
