import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Configuracao publica do push para o cliente.
 * A chave publica VAPID nao e segredo (identifica o servidor de push no
 * endpoint) mas o bundle de producao pode rodar SEM env de build (ex.: Vercel
 * sem .env committed) — entao o cliente busca a chave aqui, em runtime.
 * A chave PRIVADA fica apenas nos secrets do Supabase/env das outras functions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({ vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? "" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
