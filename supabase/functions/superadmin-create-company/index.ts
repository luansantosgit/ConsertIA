// ============================================================
// superadmin-create-company
// POST — cria empresa (tenant) + primeiro usuário admin (auth+users)
// com SENHA ALEATÓRIA gerada no servidor, devolvida na resposta
// para o superadmin compartilhar com o cliente.
//
// Regras:
//  - caller autenticado e superadmin
//  - cria tenant, auth user (role admin, user_metadata p/ RLS)
//    e linha em users com todas as permissões
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const ALL_MODULES = [
  "dashboard", "atendimento", "ordens", "clientes", "estoque",
  "financeiro", "agenda", "relatorios", "configuracoes", "agente-ia",
];

function randomPassword(len = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pw = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = pw.length; i < len; i++) pw.push(pick(all));
  // Fisher-Yates: embaralha para o padrão não ser previsível
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: caller } = await admin
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    if (caller?.role !== "superadmin") return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.admin_email ?? "").trim().toLowerCase();
    const planId = String(body.plan_id ?? "") || null;
    const themeColor = String(body.theme_color ?? "#2563eb") || "#2563eb";
    const subscriptionDueDate = String(body.subscription_due_date ?? "") || null;
    const subscriptionExtraDays = Number(body.subscription_extra_days) || 0;
    const userName = String(body.admin_name ?? "").trim() || name;

    if (!name) return json({ error: "invalid_name" }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // 1. Tenant
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name,
        slug,
        plan_id: planId,
        theme_color: themeColor,
        admin_email: email,
        active: true,
        subscription_due_date: subscriptionDueDate,
        subscription_extra_days: subscriptionExtraDays,
      })
      .select("id")
      .single();
    if (tenantErr || !tenant) {
      const msg = tenantErr?.message ?? "tenant_failed";
      return json({ error: /duplicate/i.test(msg) ? "slug_exists" : msg }, 400);
    }

    // 2. Auth user com senha aleatória (user_metadata p/ policies RLS)
    const password = randomPassword();
    const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tenant_id: tenant.id, role: "admin", name: userName },
    });
    if (createErr || !authUser?.user) {
      // rollback: não deixar tenant sem admin
      await admin.from("tenants").delete().eq("id", tenant.id);
      const msg = createErr?.message ?? "user_failed";
      return json({ error: /already|duplicate/i.test(msg) ? "email_exists" : msg }, 400);
    }

    // 3. Linha em users com todas as permissões
    const { error: insertErr } = await admin.from("users").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      email,
      name: userName,
      role: "admin",
      permissions: ALL_MODULES,
      active: true,
    });
    if (insertErr) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      await admin.from("tenants").delete().eq("id", tenant.id);
      return json({ error: "insert_failed" }, 500);
    }

    // 4. Theme row para o tenant
    await admin.from("tenant_themes").upsert({
      tenant_id: tenant.id,
      primary_color: themeColor,
      primary_dark: themeColor,
      logo_text: name,
      sidebar_dark: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    return json({
      success: true,
      tenant_id: tenant.id,
      slug,
      user_id: authUser.user.id,
      email,
      password,
    });
  } catch (err) {
    console.error("[superadmin-create-company] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
