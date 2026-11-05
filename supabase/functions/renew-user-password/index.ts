// ============================================================
// renew-user-password
// POST — admin do tenant renova a senha de um usuario da equipe
//
// Regras:
//  - caller autenticado (JWT) e role 'admin'/'superadmin'
//  - alvo: usuario do MESMO tenant (superadmin nunca e alvo)
//  - senha gerada server-side e devolvida 1x para o admin compartilhar
//  - o admin nao digita a senha de terceiros: apenas renova
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeTempPassword } from "../_shared/onboarding.ts";

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

interface Caller {
  id: string;
  tenant_id: string | null;
  role: string;
}

async function getCaller(
  url: string,
  anonKey: string,
  serviceKey: string,
  authHeader: string,
): Promise<Caller | null> {
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
  return (caller as Caller) ?? null;
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

    const caller = await getCaller(url, anonKey, serviceKey, authHeader);
    if (!caller) return json({ error: "unauthorized" }, 401);
    if (!["admin", "superadmin"].includes(caller.role)) {
      return json({ error: "forbidden" }, 403);
    }
    if (!caller.tenant_id) return json({ error: "no_tenant" }, 400);

    const admin = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({}));
    const targetId = String(body.user_id ?? "");
    if (!targetId) return json({ error: "user_required" }, 400);

    const { data: target } = await admin
      .from("users")
      .select("id, email, tenant_id, role, active")
      .eq("id", targetId)
      .maybeSingle();
    if (!target) return json({ error: "not_found" }, 404);
    if (target.role === "superadmin") return json({ error: "forbidden" }, 403);
    // Alvo precisa pertencer ao tenant do caller
    if (target.tenant_id !== caller.tenant_id) {
      return json({ error: "not_found" }, 404);
    }

    const password = makeTempPassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, {
      password,
    });
    if (updateErr) {
      return json({ error: "update_failed", detail: updateErr.message }, 500);
    }

    return json({ success: true, email: target.email, password });
  } catch (err) {
    return json({ error: "internal", detail: String(err) }, 500);
  }
});
