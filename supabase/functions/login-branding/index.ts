import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json().catch(() => ({ email: null }));
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ theme: null });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("email", email.trim())
      .limit(1)
      .maybeSingle();
    if (!profile?.tenant_id) return json({ theme: null });

    // Personalização de marca só é exposta se o plano da empresa permitir
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan_id")
      .eq("id", profile.tenant_id)
      .limit(1)
      .maybeSingle();

    if (tenant?.plan_id) {
      const { data: plan } = await supabase
        .from("plans")
        .select("custom_branding")
        .eq("id", tenant.plan_id)
        .limit(1)
        .maybeSingle();
      if (plan?.custom_branding !== true) return json({ theme: null });
    } else {
      return json({ theme: null });
    }

    const { data: theme } = await supabase
      .from("tenant_themes")
      .select("primary_color, primary_dark, logo_url, logo_type, logo_text, favicon_url")
      .eq("tenant_id", profile.tenant_id)
      .limit(1)
      .maybeSingle();

    return json({ tenant_id: profile.tenant_id, theme: theme ?? null });
  } catch (error) {
    console.error("login-branding error:", error);
    return json({ theme: null });
  }
});
