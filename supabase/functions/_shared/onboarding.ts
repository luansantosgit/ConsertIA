// ============================================================
// Onboarding compartilhado entre public-signup e asaas-webhook
// ============================================================

// Senha temporária simples e memorável: palavra-número
const PASSWORD_WORDS = [
  "feliz", "rapido", "bravo", "pronto", "solido", "auge", "vitoria", "ponte",
  "aceso", "clara", "forte", "sagaz", "astuto", "melhor", "suave", "rapina",
];

export function makeTempPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

export interface OnboardingSession {
  id: string;
  token: string;
  lead_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  whatsapp: string;
  cpf_cnpj: string;
  address: string | null;
  plan_id: string;
  tenant_id: string | null;
  connection_id: string | null;
  asaas_customer_id: string | null;
  asaas_payment_id: string | null;
  amount: number | null;
  status: string;
  temp_password: string | null;
  expires_at: string;
}

// Planos padrão da IA para o agente responder de imediato
async function ensureAiDefaults(admin: any, tenantId: string) {
  const { data: agent } = await admin
    .from("ai_agent_settings")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!agent) await admin.from("ai_agent_settings").insert({ tenant_id: tenantId });

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

// Pagamento confirmado: ativa a empresa, cria o admin com senha
// temporária, prepara a IA e lança no financeiro. Idempotente.
export async function finalizeOnboarding(
  admin: any,
  session: OnboardingSession,
  paidAt: string | null,
): Promise<{ email: string; temp_password: string; company_name: string } | null> {
  if (!session.tenant_id) return null;

  // Ja finalizada por outro caminho (webhook + poll simultaneos)
  if (session.status === "paid") {
    return {
      email: session.email,
      temp_password: session.temp_password ?? "",
      company_name: session.company_name,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const tempPassword = session.temp_password ?? makeTempPassword();

  // 1. Ativa a empresa e agenda o proximo vencimento
  await admin
    .from("tenants")
    .update({
      active: true,
      subscription_due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subscription_extra_days: 0,
    })
    .eq("id", session.tenant_id);

  // 2. Cria o usuário admin (Auth + users) com a senha temporária
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: session.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      tenant_id: session.tenant_id,
      role: "admin",
      name: session.lead_name,
    },
  });
  if (authErr && !/already/i.test(authErr.message)) return null;

  if (authUser?.user) {
    const { data: existingProfile } = await admin
      .from("users")
      .select("id")
      .eq("id", authUser.user.id)
      .maybeSingle();
    if (!existingProfile) {
      await admin.from("users").insert({
        id: authUser.user.id,
        tenant_id: session.tenant_id,
        email: session.email,
        name: session.lead_name,
        role: "admin",
        active: true,
        permissions: [],
      });
    }
  }

  // 3. IA pronta para responder no canal conectado
  await ensureAiDefaults(admin, session.tenant_id);
  if (session.connection_id) {
    await admin
      .from("connections")
      .update({ ai_enabled: true })
      .eq("id", session.connection_id);
  }

  // 4. Fatura paga + lançamento no financeiro da empresa
  const { data: plan } = await admin
    .from("plans")
    .select("name")
    .eq("id", session.plan_id)
    .single();
  if (session.asaas_payment_id) {
    const { data: invoice } = await admin
      .from("subscription_invoices")
      .select("id, status")
      .eq("asaas_payment_id", session.asaas_payment_id)
      .maybeSingle();
    if (invoice && invoice.status !== "paid") {
      await admin
        .from("subscription_invoices")
        .update({ status: "paid", paid_at: paidAt ?? today })
        .eq("id", invoice.id);
    }
  }
  const { data: existingTx } = await admin
    .from("transactions")
    .select("id")
    .eq("ref", session.id)
    .maybeSingle();
  if (!existingTx) {
    await admin.from("transactions").insert({
      tenant_id: session.tenant_id,
      type: "income",
      description: `Assinatura — ${plan?.name ?? "Plano"}`,
      amount: session.amount ?? 0,
      category: "Assinatura",
      ref: session.id,
      status: "paid",
      date: paidAt ?? today,
    });
  }

  // 5. Sessão concluída
  await admin
    .from("onboarding_sessions")
    .update({ status: "paid", temp_password: tempPassword })
    .eq("id", session.id);

  return {
    email: session.email,
    temp_password: tempPassword,
    company_name: session.company_name,
  };
}

// Purga de sessões expiradas sem pagamento (24h): exclui instância
// Uazapi, usuário auth, tenant (cascata) e a própria sessão.
export async function purgeExpiredOnboardings(admin: any) {
  const { data: expired } = await admin
    .from("onboarding_sessions")
    .select("*")
    .neq("status", "paid")
    .lt("expires_at", new Date().toISOString())
    .limit(50);

  for (const session of (expired ?? []) as OnboardingSession[]) {
    // 1. Exclui a instância Uazapi (se existir)
    if (session.connection_id) {
      const { data: conn } = await admin
        .from("connections")
        .select("instance_token")
        .eq("id", session.connection_id)
        .maybeSingle();
      if (conn?.instance_token) {
        const { data: plat } = await admin
          .from("platform_settings")
          .select("uazapi_subdomain")
          .limit(1)
          .maybeSingle();
        const base = `https://${plat?.uazapi_subdomain || "api"}.uazapi.com`;
        try {
          await fetch(`${base}/instance`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", token: conn.instance_token },
          });
        } catch { /* melhor esforço */ }
      }
    }

    // 2. Exclui os usuários auth do tenant
    if (session.tenant_id) {
      const { data: tenantUsers } = await admin
        .from("users")
        .select("id")
        .eq("tenant_id", session.tenant_id);
      for (const u of tenantUsers ?? []) {
        try { await admin.auth.admin.deleteUser(u.id); } catch { /* ignora */ }
      }
      // 3. Exclui o tenant (cascata: settings, connections, users rows, invoices)
      await admin.from("tenants").delete().eq("id", session.tenant_id);
    }

    // 4. Remove a sessão
    await admin.from("onboarding_sessions").delete().eq("id", session.id);
  }
}
