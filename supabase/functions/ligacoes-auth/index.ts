import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const JWT_SECRET = Deno.env.get("LIGACOES_JWT_SECRET") || "consertia-ligacoes-jwt-2026-prod-secret";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let tenantId: string;
    let userId: string;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const agentId = body.agent_id as string | undefined;
      const tenantIdParam = body.tenant_id as string | undefined;

      if (!agentId) {
        return new Response(JSON.stringify({ error: "agent_id required" }), { status: 400 });
      }

      // Buscar usuario pelo ID
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("id, tenant_id")
        .eq("id", agentId)
        .single();

      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "invalid user" }), { status: 401 });
      }

      userId = user.id;
      tenantId = tenantIdParam || user.tenant_id;
    } else {
      return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const now = Math.floor(Date.now() / 1000);
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        tenant_id: tenantId,
        sub: userId,
        role: "agent",
        iat: now,
        exp: getNumericDate(24 * 60 * 60),
      },
      key,
    );

    return new Response(JSON.stringify({ token: jwt, tenant_id: tenantId }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[LIGACOES_AUTH]", err);
    return new Response(JSON.stringify({ error: "internal error" }), { status: 500 });
  }
});
