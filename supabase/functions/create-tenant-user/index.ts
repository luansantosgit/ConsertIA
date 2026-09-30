// ============================================================
// create-tenant-user
// POST   — admin do tenant cria usuario (auth + users + permissoes)
// DELETE — admin do tenant remove usuario (users + auth)
//
// Regras:
//  - caller autenticado (JWT) e admin/superadmin na tabela users
//  - limite de usuarios do plano (tenants.plan_id -> plans.max_users)
//  - novo auth user nasce com user_metadata { tenant_id, role, name }
//    (necessario para as policies RLS do projeto)
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const ALLOWED_ROLES = ["admin", "manager", "technician", "attendant"];
const ALLOWED_MODULES = [
  "dashboard", "atendimento", "ordens", "clientes", "estoque",
  "financeiro", "agenda", "relatorios", "agente-ia",
];

interface Caller { id: string; tenant_id: string | null; role: string }

async function getCaller(url: string, anonKey: string, serviceKey: string, authHeader: string): Promise<Caller | null> {
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return null;

  const admin = createClient(url, serviceKey);
  const { data: caller } = await admin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authData.user.id)
    .single();
  if (!caller) return null;
  return caller as Caller;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const caller = await getCaller(url, anonKey, serviceKey, authHeader);
    if (!caller) return json({ error: "unauthorized" }, 401);
    if (!["admin", "superadmin"].includes(caller.role)) return json({ error: "forbidden" }, 403);
    if (!caller.tenant_id) return json({ error: "no_tenant" }, 400);

    const admin = createClient(url, serviceKey);
    const tenantId = caller.tenant_id;

    // ── Criar usuario ──
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim();
      const role = String(body.role ?? "attendant");
      const permissions: string[] = Array.isArray(body.permissions) ? body.permissions : [];

      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_data" }, 400);
      if (password.length < 6) return json({ error: "weak_password" }, 400);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: "invalid_role" }, 400);

      // Limite de usuarios do plano
      const { data: tenant } = await admin
        .from("tenants")
        .select("plan_id")
        .eq("id", tenantId)
        .single();
      const planId = tenant?.plan_id ?? null;
      let maxUsers = 0;
      if (planId) {
        const { data: plan } = await admin
          .from("plans")
          .select("max_users")
          .eq("id", planId)
          .single();
        maxUsers = plan?.max_users ?? 0;
      }
      const { count } = await admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        // Superadmin e master do painel superadmin: nao consome assento
        .neq("role", "superadmin");
      if (maxUsers > 0 && (count ?? 0) >= maxUsers) {
        return json({ error: "limit_reached", max_users: maxUsers }, 409);
      }

      const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { tenant_id: tenantId, role, name },
      });
      if (createErr || !authUser?.user) {
        const msg = createErr?.message ?? "create_failed";
        if (/already|duplicate/i.test(msg)) return json({ error: "email_exists" }, 409);
        return json({ error: msg }, 400);
      }

      const { error: insertErr } = await admin.from("users").insert({
        id: authUser.user.id,
        tenant_id: tenantId,
        email,
        name,
        role,
        permissions: permissions.filter((p) => ALLOWED_MODULES.includes(p)),
        active: true,
      });
      if (insertErr) {
        // rollback: nao deixar auth user orfao sem linha em users
        await admin.auth.admin.deleteUser(authUser.user.id);
        return json({ error: "insert_failed" }, 500);
      }

      return json({ success: true, user_id: authUser.user.id });
    }

    // ── Remover usuario ──
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const targetId = String(body.user_id ?? "");
      if (!targetId || targetId === caller.id) return json({ error: "invalid_target" }, 400);

      const { data: target } = await admin
        .from("users")
        .select("id, tenant_id, role")
        .eq("id", targetId)
        .single();
      if (!target || target.tenant_id !== tenantId) return json({ error: "not_found" }, 404);
      if (target.role === "superadmin") return json({ error: "forbidden" }, 403);

      await admin.from("users").delete().eq("id", targetId);
      await admin.auth.admin.deleteUser(targetId);
      return json({ success: true });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (err) {
    return json({ error: (err as Error)?.message ?? "internal_error" }, 500);
  }
});
