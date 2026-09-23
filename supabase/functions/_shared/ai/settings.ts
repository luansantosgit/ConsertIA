import type { AgentContext, AgentSettings, QuoteSettings, DiagnosisSettings, CoverageRow, TemplateRow, OpenOrderRow, AppointmentRow } from "./types.ts";

function periodOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "manhã";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noite";
}

export function currentPeriod(timezone: string): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "numeric", hour12: false });
  const hour = Number(fmt.format(new Date()));
  return periodOfDay(Number.isFinite(hour) ? hour : new Date().getHours());
}

async function loadEntitlement(supabase: any, ctx: Partial<AgentContext>): Promise<{ apiKey: string | null; tokenLimit: number }> {
  const [{ data: platform }, { data: entitlement }, { data: tenant }] = await Promise.all([
    supabase.from("platform_ai_config").select("openrouter_token, distribution_mode").limit(1).maybeSingle(),
    supabase.from("tenant_ai_entitlements").select("use_platform_token, token_limit_override").eq("tenant_id", ctx.tenantId).limit(1).maybeSingle(),
    supabase.from("tenants").select("plan_id").eq("id", ctx.tenantId).limit(1).maybeSingle(),
  ]);

  let planLimit = 0;
  if (tenant?.plan_id) {
    const { data: plan } = await supabase.from("plans").select("ai_token_limit").eq("id", tenant.plan_id).limit(1).maybeSingle();
    planLimit = plan?.ai_token_limit ?? 0;
  }

  const covered = platform?.openrouter_token &&
    (platform.distribution_mode === "all"
      ? entitlement?.use_platform_token !== false
      : entitlement?.use_platform_token === true);

  if (covered) {
    return {
      apiKey: platform.openrouter_token,
      tokenLimit: entitlement?.token_limit_override ?? planLimit,
    };
  }
  return { apiKey: ctx.agent?.own_api_key ?? null, tokenLimit: 0 };
}

export async function quotaExceeded(supabase: any, tenantId: string, limit: number): Promise<boolean> {
  if (!limit || limit <= 0) return false;
  const period = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from("ai_token_usage")
    .select("tokens_in, tokens_out")
    .eq("tenant_id", tenantId)
    .eq("period", period)
    .limit(1)
    .maybeSingle();
  const used = (usage?.tokens_in ?? 0) + (usage?.tokens_out ?? 0);
  return used >= limit;
}

export async function trackUsage(supabase: any, tenantId: string, tokensIn: number, tokensOut: number, cost: number): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  const { data: existing } = await supabase
    .from("ai_token_usage")
    .select("id, tokens_in, tokens_out, cost")
    .eq("tenant_id", tenantId)
    .eq("period", period)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ai_token_usage")
      .update({
        tokens_in: (existing.tokens_in ?? 0) + tokensIn,
        tokens_out: (existing.tokens_out ?? 0) + tokensOut,
        cost: Number(existing.cost ?? 0) + cost,
      })
      .eq("id", existing.id);
    return;
  }
  await supabase
    .from("ai_token_usage")
    .insert({ tenant_id: tenantId, period, tokens_in: tokensIn, tokens_out: tokensOut, cost });
}

export async function loadAgentContext(supabase: any, conversationId: string): Promise<AgentContext | null> {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .limit(1)
    .maybeSingle();
  if (!conversation || error) return null;

  const tenantId = conversation.tenant_id;
  const [agentRes, quoteRes, diagRes, covRes, tplRes, settingsRes] = await Promise.all([
    supabase.from("ai_agent_settings").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    supabase.from("ai_quote_settings").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    supabase.from("ai_diagnosis_settings").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    supabase.from("ai_device_coverage").select("device_type, brands, active").eq("tenant_id", tenantId).eq("active", true),
    supabase.from("ai_pre_quote_templates").select("id, title, type, content, media_url, sort_order").eq("tenant_id", tenantId).eq("active", true).order("sort_order"),
    supabase.from("tenant_settings").select("company_name, timezone, language").eq("tenant_id", tenantId).limit(1).maybeSingle(),
  ]);

  if (!agentRes.data) return null;

  const agent: AgentSettings = agentRes.data;
  const quote: QuoteSettings = quoteRes.data ?? {
    labor_enabled: false, labor_mode: "included", labor_type: "fixed", labor_value: 0, quote_template: "",
  };
  const diagnosis: DiagnosisSettings = diagRes.data ?? { repair_mode: "screen_only", glass_rules: null };
  const coverage: CoverageRow[] = (covRes.data ?? []).map((r: any) => ({ device_type: r.device_type, brands: r.brands ?? [], active: r.active }));
  const templates: TemplateRow[] = tplRes.data ?? [];

  let customer: { id: string; name: string } | null = null;
  if (conversation.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("id, name")
      .eq("id", conversation.customer_id)
      .limit(1)
      .maybeSingle();
    if (cust) customer = { id: cust.id, name: cust.name };
  }

  const openStatuses = ["pending", "diagnosis", "awaiting_approval", "approved", "awaiting_part", "in_progress", "ready"];
  let openOrders: OpenOrderRow[] = [];
  let appointments: AppointmentRow[] = [];
  if (customer) {
    const ordersRes = await supabase
      .from("service_orders")
      .select("id, subject, status, budget_amount, created_at")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .in("status", openStatuses)
      .order("created_at", { ascending: false })
      .limit(5);
    openOrders = ordersRes.data ?? [];
    if (openOrders.length > 0) {
      const apptRes = await supabase
        .from("calendar_events")
        .select("id, title, date, start_time, os_id")
        .eq("tenant_id", tenantId)
        .in("os_id", openOrders.map((o) => o.id))
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .limit(10);
      appointments = apptRes.data ?? [];
    }
  }

  const { data: platform } = await supabase.from("platform_settings").select("uazapi_subdomain").limit(1).maybeSingle();
  const uazapiBase = `https://${platform?.uazapi_subdomain || "api"}.uazapi.com`;

  let connectionToken = "";
  if (conversation.connection_id) {
    const { data: conn } = await supabase
      .from("connections")
      .select("instance_token")
      .eq("id", conversation.connection_id)
      .limit(1)
      .maybeSingle();
    if (conn?.instance_token) connectionToken = conn.instance_token;
  }
  if (!connectionToken) {
    const { data: conn } = await supabase
      .from("connections")
      .select("instance_token")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (conn?.instance_token) connectionToken = conn.instance_token;
  }

  const { data: lastInbound } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .limit(2);
  const isFirstContact = (lastInbound ?? []).length <= 1;

  const partial: Partial<AgentContext> = {
    supabase,
    conversation,
    tenantId,
    companyName: settingsRes.data?.company_name || "nossa empresa",
    agent,
    quote,
    diagnosis,
    coverage,
    templates,
    customer,
    contactName: conversation.contact_name || conversation.contact_phone,
    openOrders,
    appointments,
    isFirstContact,
    period: currentPeriod(settingsRes.data?.timezone || "America/Sao_Paulo"),
    timezone: settingsRes.data?.timezone || "America/Sao_Paulo",
    uazapiBase,
    connectionToken,
    allowedValues: new Set<number>(),
    handoffRequested: false,
    canonicalQuote: null,
    toolsUsed: [],
    toolResults: [],
  };

  const entitlement = await loadEntitlement(supabase, partial);
  partial.apiKey = entitlement.apiKey;
  partial.tokenLimit = entitlement.tokenLimit;

  return partial as AgentContext;
}
