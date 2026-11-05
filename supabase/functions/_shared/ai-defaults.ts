// ============================================================
// Defaults de IA por tenant (criacao de empresa / wizard)
//
// Um tenant novo precisa nascer PRONTO: agente ativo, perguntando
// o nome do lead e usando o modelo liberado pelo administrador.
// Sem a linha em `ai_agent_settings` o agente nem roda (o runtime
// faz `if (!agentRes.data) return null`).
// ============================================================

/**
 * Modelo padrao efetivo do tenant (espelha `resolveEffectiveModel`
 * de `_shared/ai/settings.ts`):
 * - modo "all": lista/padrao GLOBAIS (platform_ai_config)
 * - modo "selected": lista/padrao da EMPRESA (tenant_ai_entitlements)
 * - sem lista configurada: null (nao forcamos modelo)
 */
export async function resolveDefaultModel(admin: any, tenantId: string): Promise<string | null> {
  const [{ data: platform }, { data: entitlement }] = await Promise.all([
    admin
      .from("platform_ai_config")
      .select("distribution_mode, allowed_models, default_model")
      .limit(1)
      .maybeSingle(),
    admin
      .from("tenant_ai_entitlements")
      .select("allowed_models, default_model")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle(),
  ]);

  const source = platform?.distribution_mode === "all" ? platform : entitlement;
  const allowed = Array.isArray(source?.allowed_models)
    ? source.allowed_models.filter((m: any) => typeof m === "string")
    : [];
  if (allowed.length === 0) return null;

  const def = typeof source?.default_model === "string" ? source.default_model : null;
  return def && allowed.includes(def) ? def : allowed[0];
}

/**
 * Config do agente escolhida na etapa "Configure seu agente de IA"
 * do wizard publico (Issue #95).
 */
export interface AgentWizardConfig {
  agent_name?: string | null;
  agent_presentation?: string | null;
  agent_greeting?: boolean | null;
  agent_auto_schedule?: boolean | null;
  agent_auto_os?: boolean | null;
}

/** Estilos de apresentacao aceitos (o prompt usa esse tom). */
export const PRESENTATION_STYLES = ["amigavel", "formal", "tecnico", "proximo"] as const;

export type PresentationStyle = (typeof PRESENTATION_STYLES)[number];

/** Normaliza o estilo recebido (sessao do wizard) para um valor valido. */
export function normalizePresentationStyle(value: unknown): PresentationStyle {
  const raw = String(value ?? '').trim().toLowerCase();
  return (PRESENTATION_STYLES as readonly string[]).includes(raw)
    ? (raw as PresentationStyle)
    : 'amigavel';
}

/** Patch de ai_agent_settings com as escolhas do wizard (vazio se nao houver). */
function buildWizardPatch(config?: AgentWizardConfig | null): Record<string, unknown> {
  if (!config) return {};
  const patch: Record<string, unknown> = {};
  const name = String(config.agent_name ?? '').trim();
  if (name) patch.agent_name = name.slice(0, 40);
  if (config.agent_presentation) {
    patch.presentation_style = normalizePresentationStyle(config.agent_presentation);
  }
  if (typeof config.agent_greeting === 'boolean') patch.greeting_enabled = config.agent_greeting;
  if (typeof config.agent_auto_schedule === 'boolean') {
    patch.auto_schedule_enabled = config.agent_auto_schedule;
  }
  if (typeof config.agent_auto_os === 'boolean') patch.auto_os_enabled = config.agent_auto_os;
  return patch;
}

/**
 * Garante as settings basicas de IA do tenant:
 * - cria a row (agente ativo, perguntando o nome, modelo liberado)
 * - aplica a config escolhida no wizard, quando houver
 * Idempotente: nao sobrescreve configuracoes quando nao ha config.
 */
export async function ensureAiDefaults(
  admin: any,
  tenantId: string,
  config?: AgentWizardConfig | null,
): Promise<void> {
  const { data: agent } = await admin
    .from("ai_agent_settings")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const wizardPatch = buildWizardPatch(config);

  if (!agent) {
    const model = await resolveDefaultModel(admin, tenantId);
    await admin.from("ai_agent_settings").insert({
      tenant_id: tenantId,
      // Agente ativo e perguntando o nome: ja nascem ligados
      active: true,
      ask_name_enabled: true,
      // Modelo liberado pelo administrador (evita o aviso de
      // "modelo atual nao esta na lista liberada")
      ...(model ? { openrouter_model: model } : {}),
      ...wizardPatch,
    });
  } else if (Object.keys(wizardPatch).length > 0) {
    // Config explicita do wizard: aplica as escolhas do lead
    await admin
      .from("ai_agent_settings")
      .update(wizardPatch)
      .eq("tenant_id", tenantId);
  }

  const { data: quote } = await admin
    .from("ai_quote_settings")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!quote) await admin.from("ai_quote_settings").insert({ tenant_id: tenantId });

  const { data: diag } = await admin
    .from("ai_diagnosis_settings")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!diag) await admin.from("ai_diagnosis_settings").insert({ tenant_id: tenantId });

  const { data: cfg } = await admin
    .from("ai_configs")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!cfg) await admin.from("ai_configs").insert({ tenant_id: tenantId });
}
