import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createVapidHeader, encryptWebPushPayload } from "../_shared/push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushBody {
  tenantId: string;
  title: string;
  body: string;
  kind?: "message" | "appointment" | "os" | "billing" | "custom";
  conversationId?: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Valida o role do payload do JWT (base64url → base64 antes de atob)
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  let tokenRole = "";
  try {
    const payloadB64 = token.split(".")[1] ?? "";
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    tokenRole = JSON.parse(atob(normalized + padding))?.role ?? "";
  } catch {
    tokenRole = "";
  }
  if (tokenRole !== "service_role") {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:suporte@deeperia.com.br";
  if (!publicKey || !privateKey) {
    return new Response(JSON.stringify({ ok: false, error: "VAPID keys nao configuradas" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { tenantId, title, body, kind, conversationId, url, data } = (await req.json()) as SendPushBody;
    if (!tenantId || !title) {
      return new Response(JSON.stringify({ ok: false, error: "tenantId e title obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("tenant_id", tenantId);

    if (fetchError) {
      return new Response(JSON.stringify({ ok: false, error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, removed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidKeys = { publicKey, privateKey };
    const payload = JSON.stringify({ title, body, kind, conversationId, url: url ?? "/atendimento", data: data ?? {} });
    let sent = 0;
    const expired: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const encrypted = await encryptWebPushPayload(payload, sub);
          const authorization = await createVapidHeader(vapidKeys, sub.endpoint, subject);
          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              TTL: "86400",
              Urgency: "high",
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              Authorization: authorization,
            },
            body: encrypted,
          });
          if (res.ok || res.status === 429) {
            sent++;
          } else if (res.status === 404 || res.status === 410) {
            expired.push(sub.id);
          } else {
            console.warn(`[send-push] ${res.status} em ${sub.endpoint}: ${await res.text()}`);
          }
        } catch (err) {
          console.warn(`[send-push] falha em ${sub.endpoint}:`, (err as Error).message);
        }
      }),
    );

    // Subscriptions invalidas (app desinstalado / endpoint expirado)
    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ ok: true, sent, removed: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
