// ============================================================
// wizard-finalize
// POST — superadmin finaliza manualmente o wizard de uma empresa
//
// Use case: o cliente parou no wizard (não pagou pelo Asaas) mas
// pagou direto com o superadmin. O superadmin confirma o pagamento
// e o sistema executa as etapas finais do wizard: ativa a empresa,
// cria o usuario admin com senha temporaria e lanca a receita.
//
// Regras:
//  - caller autenticado (JWT) e role 'superadmin' na tabela users
//  - idempotente: reexecutar nao duplica usuario nem lancamento
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  finalizeOnboarding,
  makeTempPassword,
  type OnboardingSession,
} from "../_shared/onboarding.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function getSuperadmin(
  url: string,
  anonKey: string,
  serviceKey: string,
  authHeader: string,
): Promise<boolean> {
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return false;

  const admin = createClient(url, serviceKey);
  const { data: caller } = await admin
    .from("users")
    .select("id, role, active")
    .eq("id", authData.user.id)
    .single();
  return Boolean(caller && caller.role === "superadmin" && caller.active);
}

/** Localiza o usuario no Auth pelo e-mail (listUsers paginado). */
async function findAuthUserByEmail(admin: any, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = (data?.users ?? []).find(
    (u: { email?: string }) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  return match ?? null;
}

/** Garante a linha do perfil em `users` (o finalizeOnboarding so cria se nao existir). */
async function ensureUserProfile(
  admin: any,
  userId: string,
  email: string,
  tenantId: string,
  name: string,
) {
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  await admin.from("users").insert({
    id: userId,
    tenant_id: tenantId,
    email,
    name,
    role: "admin",
    active: true,
    permissions: [],
  });
}

/** Recupera a sessao de onboarding do tenant (prioriza nao paga). */
async function findSession(admin: any, tenantId: string): Promise<OnboardingSession | null> {
  const { data } = await admin
    .from("onboarding_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as OnboardingSession | null) ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const isSuperadmin = await getSuperadmin(url, anonKey, serviceKey, authHeader);
    if (!isSuperadmin) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({}));
    const tenantId = String(body.tenant_id ?? "");
    if (!tenantId) return json({ error: "tenant_required" }, 400);

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, name, plan_id, admin_email")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant) return json({ error: "tenant_not_found" }, 404);

    const email = String(body.user_email ?? "").trim().toLowerCase() ||
      String(tenant.admin_email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "admin_email_required" }, 400);

    const planId = String(body.plan_id ?? "").trim() || tenant.plan_id || null;

    // 1. Sessao de onboarding: usa a existente ou cria uma para o tenant
    let session = await findSession(admin, tenantId);
    if (!session) {
      const token = crypto.randomUUID();
      const { data: created, error: sessionErr } = await admin
        .from("onboarding_sessions")
        .insert({
          token,
          lead_name: tenant.name,
          company_name: tenant.name,
          email,
          whatsapp: "",
          cpf_cnpj: "",
          plan_id: planId,
          tenant_id: tenantId,
        })
        .select()
        .single();
      if (sessionErr || !created) return json({ error: "session_failed" }, 500);
      session = created as OnboardingSession;
    }

    // 2. Aplica e-mail/plano confirmados pelo superadmin
    const patch: Record<string, unknown> = { email, status: "connected" };
    if (planId) patch.plan_id = planId;
    await admin.from("onboarding_sessions").update(patch).eq("id", session.id);
    session = { ...session, ...patch } as OnboardingSession;

    // 3. Usuario no Auth: garante senha conhecida para exibir ao admin
    const authUser = await findAuthUserByEmail(admin, email);
    let password = session.temp_password ?? makeTempPassword();
    if (authUser) {
      const { error: updErr } = await admin.auth.admin.updateUserById(authUser.id, {
        password,
      });
      if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);
      await ensureUserProfile(admin, authUser.id, email, tenantId, session.lead_name || tenant.name);
    } else {
      session.temp_password = password;
      await admin.from("onboarding_sessions").update({ temp_password: password }).eq("id", session.id);
    }

    // 4. Executa as etapas finais do wizard (ativa tenant, cria admin,
    //    prepara IA, lanca receita e conclui a sessao)
    const today = new Date().toISOString().slice(0, 10);
    const credentials = await finalizeOnboarding(admin, session, today);
    if (!credentials) return json({ error: "finalize_failed" }, 500);

    return json({
      success: true,
      email: credentials.email,
      password: credentials.temp_password,
      company_name: credentials.company_name,
    });
  } catch (err) {
    return json({ error: "internal", detail: String(err) }, 500);
  }
});
