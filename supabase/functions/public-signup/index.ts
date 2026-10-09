// ============================================================
// public-signup — wizard público de cadastro rápido (/comece-agora)
// Deploy: supabase functions deploy public-signup --no-verify-jwt
//
// Ações (POST { action, token, ... }):
//   plans          — lista planos ativos
//   start          — cria tenant (inativo) + sessão com dados reais
//   connect        — cria instância Uazapi (token global) + QR Code
//   poll_connection— status da conexão WhatsApp
//   create_payment — cobrança Asaas do plano escolhido
//   pix            — QR Code Pix da cobrança em aberto
//   poll_payment   — status do pagamento (finaliza se pago)
//   expire_payment — 5 min sem pagar: desconecta o canal
//   status         — retomada do wizard após refresh
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  finalizeOnboarding,
  purgeExpiredOnboardings,
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

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

function validEmail(v: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

function validCpfCnpj(raw: string): boolean {
  const c = digits(raw);
  if (c.length === 11) {
    if (/^(\d)\1{10}$/.test(c)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(c[i]) * (10 - i);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== Number(c[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(c[i]) * (11 - i);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === Number(c[10]);
  }
  if (c.length === 14) {
    if (/^(\d)\1{13}$/.test(c)) return false;
    const calc = (len: number) => {
      let sum = 0, pos = len - 7;
      for (let i = 0; i < len; i++) {
        sum += Number(c[i]) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
  }
  return false;
}

const slugify = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// ── Uazapi (token global) ──
async function getPlatform(admin: any) {
  const { data } = await admin
    .from("platform_settings")
    .select("admin_api_token, uazapi_subdomain, webhook_url")
    .limit(1)
    .maybeSingle();
  return {
    adminToken: data?.admin_api_token ?? "",
    subdomain: data?.uazapi_subdomain || "api",
    webhookUrl: data?.webhook_url ?? "",
    base: `https://${data?.uazapi_subdomain || "api"}.uazapi.com`,
  };
}

async function uazapiStatus(base: string, token: string) {
  const res = await fetch(`${base}/instance/status`, { headers: { token } });
  const data = await res.json().catch(() => ({}));
  return {
    connected: data?.status?.connected === true ||
      data?.status?.loggedIn === true ||
      data?.instance?.status === "connected",
    profileName: data?.instance?.profileName ?? null,
  };
}

// ── Asaas ──
const ASAAS_BASE: Record<string, string> = {
  sandbox: "https://api-sandbox.asaas.com",
  production: "https://api.asaas.com",
};

async function getAsaas(admin: any) {
  const { data } = await admin
    .from("asaas_config")
    .select("access_token, environment, enabled_methods, onboarding_enabled_methods")
    .limit(1)
    .maybeSingle();
  return {
    token: data?.access_token ?? "",
    env: data?.environment ?? "sandbox",
    methods: data?.enabled_methods ?? [],
    onboardingMethods: data?.onboarding_enabled_methods ?? [],
  };
}

async function asaas(cfg: { token: string; env: string }, path: string, init?: RequestInit) {
  const res = await fetch(`${ASAAS_BASE[cfg.env]}/v3${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", access_token: cfg.token, ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, body };
  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const getSession = async (token: string): Promise<OnboardingSession | null> => {
      const { data } = await admin
        .from("onboarding_sessions")
        .select("*")
        .eq("token", String(token ?? ""))
        .maybeSingle();
      return data as OnboardingSession | null;
    };

    // ── Planos ativos (público) ──
    if (action === "plans") {
      const { data } = await admin
        .from("plans")
        .select("id, name, price, features, featured")
        .eq("active", true)
        .order("price", { ascending: true });
      // Formas de pagamento do wizard: configuracao propria do wizard,
      // com fallback para as formas globais da assinatura
      const asaasCfg = await getAsaas(admin);
      const wizardMethods = asaasCfg.onboardingMethods.length > 0
        ? asaasCfg.onboardingMethods
        : asaasCfg.methods;
      return json({ plans: data ?? [], enabled_methods: wizardMethods });
    }

    // ── Retomada do wizard ──
    if (action === "status") {
      const session = await getSession(String(body.token ?? ""));
      if (!session) return json({ error: "session_not_found" }, 404);
      if (new Date(session.expires_at) < new Date() && session.status !== "paid") {
        return json({ status: "expired" });
      }
      const { data: plan } = await admin
        .from("plans")
        .select("name, price, features")
        .eq("id", session.plan_id)
        .maybeSingle();
      let payment = null;
      if (session.asaas_payment_id) {
        const { data: invoice } = await admin
          .from("subscription_invoices")
          .select("billing_type, status, invoice_url, bank_slip_url, pix_payload, due_date")
          .eq("asaas_payment_id", session.asaas_payment_id)
          .maybeSingle();
        payment = invoice ? { ...invoice, amount: session.amount } : null;
      }
      return json({
        status: session.status,
        plan: plan ? { ...plan, id: session.plan_id } : null,
        payment,
        expires_at: session.expires_at,
        company_name: session.company_name,
        credentials: session.status === "paid"
          ? { email: session.email, temp_password: session.temp_password }
          : null,
      });
    }

    // ── Início: dados reais + tenant (inativo até pagar) ──
    if (action === "start") {
      // Purga de sessões expiradas sem pagamento (24h)
      await purgeExpiredOnboardings(admin);

      const email = String(body.email ?? "").trim().toLowerCase();
      const companyName = String(body.company_name ?? "").trim();
      const leadName = String(body.lead_name ?? "").trim();
      const whatsapp = digits(String(body.whatsapp ?? ""));
      const cpfCnpj = digits(String(body.cpf_cnpj ?? ""));
      const planId = String(body.plan_id ?? "");
      const phone = digits(String(body.phone ?? "")) || null;
      const address = String(body.address ?? "").trim() || null;

      if (!leadName || !companyName) return json({ error: "missing_name" }, 400);
      if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
      if (whatsapp.length < 10 || whatsapp.length > 13) return json({ error: "invalid_whatsapp" }, 400);
      if (!validCpfCnpj(cpfCnpj)) return json({ error: "invalid_cpf_cnpj" }, 400);

      // Idempotente: sessão ativa do mesmo e-mail → retoma
      const { data: existing } = await admin
        .from("onboarding_sessions")
        .select("token, status")
        .eq("email", email)
        .neq("status", "paid")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return json({ token: existing.token, resumed: true });

      // E-mail já usado em tenant existente → não duplica
      const { data: usedEmail } = await admin
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1);
      if ((usedEmail ?? []).length > 0) return json({ error: "email_exists" }, 409);

      const { data: tenant, error: tenantErr } = await admin
        .from("tenants")
        .insert({
          name: companyName,
          slug: `${slugify(companyName) || "empresa"}-${crypto.randomUUID().slice(0, 4)}`,
          plan_id: planId || null,
          active: false,
          subscription_due_date: new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();
      if (tenantErr || !tenant) return json({ error: "tenant_failed" }, 500);

      // Dados reais da empresa nos campos existentes (usados pela IA)
      await admin.from("tenant_settings").insert({
        tenant_id: tenant.id,
        company_name: companyName,
        cnpj: cpfCnpj,
        phone,
        whatsapp,
        address,
      });

      const token = crypto.randomUUID();
      await admin.from("onboarding_sessions").insert({
        token,
        lead_name: leadName,
        company_name: companyName,
        email,
        phone,
        whatsapp,
        cpf_cnpj: cpfCnpj,
        address,
        plan_id: planId || null,
        tenant_id: tenant.id,
      });

      // expires_at = prazo limite para pagar antes da exclusao automatica
      const { data: created } = await admin
        .from("onboarding_sessions")
        .select("expires_at")
        .eq("token", token)
        .single();
      return json({ token, expires_at: created?.expires_at });
    }

    // A partir daqui: sessão obrigatória
    const session = await getSession(String(body.token ?? ""));
    if (!session) return json({ error: "session_not_found" }, 404);
    if (session.status === "paid") {
      return json({
        status: "paid",
        credentials: { email: session.email, temp_password: session.temp_password },
      });
    }
    if (new Date(session.expires_at) < new Date()) {
      return json({ status: "expired", error: "session_expired" }, 410);
    }

    // ── Escolha do plano (após os dados) ──
    if (action === "set_plan") {
      const { data: plan } = await admin
        .from("plans")
        .select("id, name, price")
        .eq("id", String(body.plan_id ?? ""))
        .eq("active", true)
        .maybeSingle();
      if (!plan) return json({ error: "invalid_plan" }, 400);
      await admin
        .from("onboarding_sessions")
        .update({ plan_id: plan.id })
        .eq("id", session.id);
      if (session.tenant_id) {
        await admin.from("tenants").update({ plan_id: plan.id }).eq("id", session.tenant_id);
      }
      return json({ plan: { id: plan.id, name: plan.name, price: Number(plan.price) } });
    }

    // ── Conectar WhatsApp (instância com token global) ──
    if (action === "connect") {
      if (!session.tenant_id) return json({ error: "no_tenant" }, 400);
      const plat = await getPlatform(admin);
      if (!plat.adminToken) return json({ error: "uazapi_not_configured" }, 400);

      let connectionId = session.connection_id;
      let instanceToken: string | null = null;
      if (connectionId) {
        const { data: conn } = await admin
          .from("connections")
          .select("instance_token")
          .eq("id", connectionId)
          .maybeSingle();
        instanceToken = conn?.instance_token ?? null;
      }

      if (!instanceToken) {
        const instanceName = `deeperia-${Date.now()}`;
        const createResp = await fetch(`${plat.base}/instance/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", admintoken: plat.adminToken },
          body: JSON.stringify({ name: instanceName }),
        });
        const createData = await createResp.json().catch(() => ({}));
        if (!createResp.ok) return json({ error: "instance_failed" }, 502);
        instanceToken = createData?.token || createData?.instanceToken || createData?.instance?.token;

        const { data: conn } = await admin
          .from("connections")
          .insert({
            tenant_id: session.tenant_id,
            name: "WhatsApp",
            provider: "api_alternativa",
            status: "waiting",
            instance_name: instanceName,
            instance_token: instanceToken,
          })
          .select()
          .single();

        // Guarda atomica contra chamadas concorrentes (duplo clique /
        // efeitos duplicados): so a primeira grava; a segunda adota a vencedora
        const { data: claimed } = await admin
          .from("onboarding_sessions")
          .update({ connection_id: conn.id })
          .eq("id", session.id)
          .is("connection_id", null)
          .select("connection_id")
          .maybeSingle();
        if (claimed) {
          connectionId = claimed.connection_id;
        } else {
          // Perdeu a corrida: exclui a instancia orfa e usa a vencedora
          try {
            await fetch(`${plat.base}/instance`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", token: instanceToken! },
            });
          } catch { /* melhor esforço */ }
          await admin.from("connections").delete().eq("id", conn.id);
          const { data: winner } = await admin
            .from("onboarding_sessions")
            .select("connection_id")
            .eq("id", session.id)
            .single();
          connectionId = winner.connection_id;
          const { data: wconn } = await admin
            .from("connections")
            .select("instance_token")
            .eq("id", connectionId)
            .maybeSingle();
          instanceToken = wconn?.instance_token ?? null;
        }

        // Webhook de mensagens → IA responde assim que conectar
        if (plat.webhookUrl && instanceToken) {
          try {
            await fetch(`${plat.base}/webhook`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token: instanceToken },
              body: JSON.stringify({
                url: plat.webhookUrl,
                events: ["messages", "messages_update", "connection"],
                excludeMessages: ["wasSentByApi"],
                enabled: true,
              }),
            });
          } catch { /* melhor esforço */ }
        }
      }

      // QR Code — systemName: nome do sistema (tema global do superadmin)
      // exibido no celular em "aparelhos conectados" (sem isso mostra uazapiGO)
      const { data: globalSettings } = await admin
        .from("global_settings")
        .select("theme")
        .limit(1)
        .maybeSingle();
      const systemName = (globalSettings?.theme as { logoText?: string } | null)?.logoText || "DeeperIA";
      const connectResp = await fetch(`${plat.base}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: instanceToken! },
        body: JSON.stringify({ browser: "auto", systemName }),
      });
      const connectData = await connectResp.json().catch(() => ({}));
      const qrCode = connectData?.qrcode || connectData?.qrCode || connectData?.qr ||
        connectData?.base64 || connectData?.instance?.qrcode || null;

      return json({ qr_code: qrCode });
    }

    // ── Polling da conexão ──
    if (action === "poll_connection") {
      if (!session.connection_id) return json({ error: "not_connected_yet" }, 400);
      const { data: conn } = await admin
        .from("connections")
        .select("instance_token")
        .eq("id", session.connection_id)
        .maybeSingle();
      if (!conn?.instance_token) return json({ error: "no_instance" }, 400);

      const plat = await getPlatform(admin);
      const { connected, profileName } = await uazapiStatus(plat.base, conn.instance_token);

      if (connected && session.status === "lead") {
        await admin
          .from("onboarding_sessions")
          .update({ status: "connected" })
          .eq("id", session.id);
        await admin
          .from("connections")
          .update({ status: "connected", profile_name: profileName })
          .eq("id", session.connection_id);
      }
      return json({ connected });
    }

    // ── Sincronizar histórico de mensagens (após conectar) ──
    if (action === "sync_history") {
      if (!session.connection_id) return json({ error: "not_connected_yet" }, 400);
      const { data: conn } = await admin
        .from("connections")
        .select("instance_token")
        .eq("id", session.connection_id)
        .maybeSingle();
      if (!conn?.instance_token) return json({ error: "no_instance" }, 400);

      const plat = await getPlatform(admin);
      const maxChats = 30;

      // 1. Lista chats mais recentes (exclui grupos)
      const chatRes = await fetch(`${plat.base}/chat/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: conn.instance_token },
        body: JSON.stringify({
          limit: maxChats,
          offset: 0,
          sort: "-wa_lastMsgTimestamp",
          wa_isGroup: false,
        }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        return json({ error: chatData?.message ?? "chat_find_failed" }, 502);
      }
      const chats: Array<{ wa_chatid?: string }> = chatData?.chats ?? [];
      const jids = chats
        .map((c) => c.wa_chatid)
        .filter((jid): jid is string => Boolean(jid) && jid.includes("@s.whatsapp.net"));

      if (jids.length === 0) return json({ synced: 0, total: 0 });

      // 2. Solicita history-sync para cada chat (mensagens chegam via webhook)
      let synced = 0;
      for (const jid of jids) {
        try {
          const syncRes = await fetch(`${plat.base}/message/history-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: conn.instance_token },
            body: JSON.stringify({ number: jid, mode: "history", count: 50 }),
          });
          if (syncRes.ok) synced++;
        } catch {
          // segue para o próximo chat
        }
      }
      return json({ synced, total: jids.length });
    }

    // ── Cobrança do plano ──
    if (action === "create_payment") {
      if (session.status !== "connected") return json({ error: "connect_whatsapp_first" }, 400);
      if (!session.plan_id) return json({ error: "invalid_plan" }, 400);
      const asaasCfg = await getAsaas(admin);
      if (!asaasCfg.token) return json({ error: "asaas_not_configured" }, 400);
      const billingType = String(body.billing_type ?? "PIX");
      // Wizard usa as formas próprias do onboarding (fallback: globais)
      const wizardMethods = asaasCfg.onboardingMethods.length > 0
        ? asaasCfg.onboardingMethods
        : asaasCfg.methods;
      if (!wizardMethods.includes(billingType)) return json({ error: "method_not_enabled" }, 403);

      const { data: plan } = await admin
        .from("plans")
        .select("id, name, price")
        .eq("id", session.plan_id)
        .single();
      if (!plan) return json({ error: "invalid_plan" }, 400);

      // Idempotente: cobrança já criada → devolve
      if (session.asaas_payment_id) {
        const { data: invoice } = await admin
          .from("subscription_invoices")
          .select("billing_type, invoice_url, bank_slip_url, pix_payload")
          .eq("asaas_payment_id", session.asaas_payment_id)
          .maybeSingle();
        return json({ payment: { ...invoice, amount: session.amount }, reused: true });
      }

      // Cliente Asaas com os dados reais
      let customerId = session.asaas_customer_id ?? "";
      if (!customerId) {
        const customer = await asaas(asaasCfg, "/customers", {
          method: "POST",
          body: JSON.stringify({
            name: session.company_name,
            cpfCnpj: session.cpf_cnpj,
            email: session.email,
            mobilePhone: session.whatsapp,
            address: session.address ?? undefined,
            externalReference: session.id,
          }),
        });
        customerId = customer.id;
        await admin
          .from("onboarding_sessions")
          .update({ asaas_customer_id: customerId })
          .eq("id", session.id);
      }

      const today = new Date().toISOString().slice(0, 10);
      const payment = await asaas(asaasCfg, "/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: Number(plan.price),
          dueDate: today,
          description: `Assinatura plano ${plan.name} — ${session.company_name}`,
          externalReference: session.id,
        }),
      });

      let pixImage: string | null = null;
      let pixPayload: string | null = null;
      if (billingType === "PIX") {
        try {
          const qr = await asaas(asaasCfg, `/payments/${payment.id}/pixQrCode`);
          pixImage = qr.encodedImage ?? null;
          pixPayload = qr.payload ?? null;
        } catch { /* melhor esforço */ }
      }

      const { error: invErr } = await admin.from("subscription_invoices").insert({
        id: session.id,
        tenant_id: session.tenant_id,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: Number(plan.price),
        billing_type: billingType,
        status: "pending",
        asaas_payment_id: payment.id,
        due_date: today,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: payment.bankSlipUrl,
        pix_payload: pixPayload,
      });
      if (invErr) return json({ error: "invoice_failed" }, 500);

      await admin
        .from("onboarding_sessions")
        .update({ asaas_payment_id: payment.id, amount: Number(plan.price) })
        .eq("id", session.id);

      return json({
        payment: {
          billing_type: billingType,
          amount: Number(plan.price),
          invoice_url: payment.invoiceUrl,
          bank_slip_url: payment.bankSlipUrl,
          pix_payload: pixPayload,
        },
        pix_encoded_image: pixImage,
      });
    }

    // ── QR Code Pix da cobrança em aberto (retomada) ──
    if (action === "pix") {
      if (!session.asaas_payment_id) return json({ error: "no_payment" }, 400);
      const asaasCfg = await getAsaas(admin);
      try {
        const qr = await asaas(asaasCfg, `/payments/${session.asaas_payment_id}/pixQrCode`);
        return json({ encoded_image: qr.encodedImage ?? null, payload: qr.payload ?? null });
      } catch {
        return json({ error: "pix_unavailable" }, 400);
      }
    }

    // ── Polling do pagamento ──
    if (action === "poll_payment") {
      if (!session.asaas_payment_id) return json({ paid: false });
      const asaasCfg = await getAsaas(admin);
      let st = "pending";
      try {
        const p = await asaas<{ status: string; deleted?: boolean; paymentDate: string | null }>(
          asaasCfg, `/payments/${session.asaas_payment_id}`,
        );
        st = p.deleted === true
          ? "canceled"
          : ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status)
            ? "paid"
            : p.status === "OVERDUE" ? "overdue" : "pending";
        if (st === "paid") {
          const credentials = await finalizeOnboarding(admin, session, p.paymentDate);
          if (credentials) {
            return json({ paid: true, credentials });
          }
        }
      } catch (err) {
        if ((err as { status?: number })?.status === 404) {
          await admin
            .from("onboarding_sessions")
            .update({ status: "expired" })
            .eq("id", session.id);
          return json({ paid: false, canceled: true });
        }
      }
      return json({ paid: false, status: st });
    }

    // ── 5 min sem pagar: desconecta o canal ──
    if (action === "expire_payment") {
      const plat = await getPlatform(admin);
      if (session.connection_id) {
        const { data: conn } = await admin
          .from("connections")
          .select("instance_token")
          .eq("id", session.connection_id)
          .maybeSingle();
        if (conn?.instance_token) {
          try {
            await fetch(`${plat.base}/instance/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token: conn.instance_token },
              body: "{}",
            });
          } catch { /* melhor esforço */ }
        }
        await admin
          .from("connections")
          .update({ status: "disconnected" })
          .eq("id", session.connection_id);
      }
      await admin
        .from("onboarding_sessions")
        .update({ status: "awaiting_payment" })
        .eq("id", session.id);
      return json({ expires_at: session.expires_at });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    return json({ error: (err as Error)?.message ?? "internal_error" }, 500);
  }
});
