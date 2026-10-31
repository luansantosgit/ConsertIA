// ============================================================
// superadmin-reset-password
// POST — superadmin regera senha aleatória do admin de uma empresa
//
// Regras:
//  - caller autenticado (JWT) e role 'superadmin' na tabela users
//  - alvo: primeiro usuario admin ativo do tenant informado
//  - senha aleatória gerada server-side e devolvida 1x para exibir/copiar
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

async function getSuperadmin(
  url: string,
  anonKey: string,
  serviceKey: string,
  authHeader: string,
): Promise<{ id: string } | null> {
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return null;

  const admin = createClient(url, serviceKey);
  const { data: caller } = await admin
    .from("users")
    .select("id, role, active")
    .eq("id", authData.user.id)
    .single();
  if (!caller || caller.role !== "superadmin" || !caller.active) return null;
  return { id: caller.id };
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
    const caller = await getSuperadmin(url, anonKey, serviceKey, authHeader);
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({}));
    const tenantId = String(body.tenant_id ?? "");
    if (!tenantId) return json({ error: "tenant_required" }, 400);

    // Primeiro admin do tenant (fallback: primeiro usuario qualquer)
    const { data: target } = await admin
      .from("users")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const { data: fallbackTarget } = !target
      ? await admin
          .from("users")
          .select("id, email")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };
    const user = target ?? fallbackTarget;
    if (!user) return json({ error: "user_not_found" }, 404);

    const password = makeTempPassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      password,
    });
    if (updateErr) return json({ error: "update_failed", detail: updateErr.message }, 500);

    return json({ email: user.email, password });
  } catch (err) {
    return json({ error: "internal", detail: String(err) }, 500);
  }
});
