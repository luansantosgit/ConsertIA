// Edge Function pública do site institucional DeeperIA (deeperia.com.br).
// - GET  : configuração pública exibida no site (whatsapp de vendas + branding).
// - POST : captura de lead (validação + upsert em landing_leads).
//
// Deploy OBRIGATÓRIO sem verificação de JWT (o site não tem sessão):
//   supabase functions deploy landing-lead --no-verify-jwt

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

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

function intIn(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const truncated = Math.trunc(parsed);
  if (truncated < min || truncated > max) return null;
  return truncated;
}

async function getPublicConfig(): Promise<Record<string, unknown>> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Seleciona APENAS os campos públicos — platform_settings guarda segredos.
  const [{ data: platform }, { data: global }, { data: planRows }] = await Promise.all([
    supabase.from("platform_settings").select("support_whatsapp").limit(1).maybeSingle(),
    supabase.from("global_settings").select("theme").limit(1).maybeSingle(),
    supabase
      .from("plans")
      .select("name, price, features, show_on_site, featured")
      .eq("active", true)
      .order("price", { ascending: true }),
  ]);

  const theme = (global?.theme ?? {}) as Record<string, unknown>;

  const plans = (planRows ?? []).map((p: Record<string, unknown>) => ({
    name: (p.name as string) ?? "",
    price: typeof p.price === "number" ? p.price : 0,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    show_on_site: p.show_on_site === true,
    featured: p.featured === true,
  }));

  return {
    support_whatsapp: platform?.support_whatsapp ?? "",
    plans,
    branding: {
      logo_url: (theme.logo_url as string) ?? null,
      logo_type: (theme.logo_type as string) ?? "icon",
      logo_text: (theme.logo_text as string) ?? "DeeperIA",
    },
  };
}

async function saveLead(payload: Record<string, unknown>): Promise<Response> {
  const name = String(payload.name ?? "").trim();
  const whatsapp = digits(payload.whatsapp);
  const storeName = String(payload.store_name ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    return json({ ok: false, error: "Informe seu nome." }, 400);
  }
  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return json({ ok: false, error: "Informe um WhatsApp válido com DDD." }, 400);
  }
  if (storeName.length < 2 || storeName.length > 100) {
    return json({ ok: false, error: "Informe o nome da sua loja." }, 400);
  }

  const quotesPerDay = payload.quotes_per_day == null ? null : intIn(payload.quotes_per_day, 0, 1000);
  const ticket = payload.ticket == null ? null : intIn(payload.ticket, 0, 1000000);
  const planName = String(payload.plan_name ?? "").trim().slice(0, 100);
  if (quotesPerDay === null && payload.quotes_per_day != null) {
    return json({ ok: false, error: "Orçamentos por dia inválido." }, 400);
  }
  if (ticket === null && payload.ticket != null) {
    return json({ ok: false, error: "Ticket médio inválido." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Upsert por WhatsApp: reenvios atualizam dados de contato sem perder
  // status/notes do funil já em andamento no superadmin.
  const now = new Date().toISOString();
  const { error } = await supabase.from("landing_leads").upsert(
    {
      name,
      whatsapp,
      store_name: storeName,
      quotes_per_day: quotesPerDay,
      ticket,
      plan_name: planName || null,
      updated_at: now,
    },
    { onConflict: "whatsapp" }
  );

  if (error) {
    console.error("landing-lead insert error:", error);
    return json({ ok: false, error: "Não foi possível registrar agora. Tente novamente." }, 500);
  }

  return json({ ok: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      return json(await getPublicConfig());
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return saveLead(body as Record<string, unknown>);
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("landing-lead error:", error);
    return json({ ok: false, error: "Erro interno." }, 500);
  }
});
