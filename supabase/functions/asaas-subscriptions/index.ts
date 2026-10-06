// ============================================================
// asaas-subscriptions
// GET  — overview: plano, formas habilitadas, faturas, vencida?
// POST — { action: 'create', billing_type } cria cobranca Asaas
//        { action: 'sync', invoice_id }    sincroniza status
//        { action: 'pix', invoice_id }      QR Code Pix de fatura aberta
//
// Token Asaas vive em asaas_config (service role apenas).
// Docs: POST /v3/payments, /v3/customers,
//       GET /v3/payments/{id}/pixQrCode
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const ASAAS_BASE: Record<string, string> = {
  sandbox: "https://api-sandbox.asaas.com",
  production: "https://api.asaas.com",
};

interface AsaasConfig {
  access_token: string;
  environment: string;
  enabled_methods: string[];
}

interface AsaasError { status?: number; body?: { errors?: { description?: string }[] } }

async function asaas<T>(
  cfg: AsaasConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE[cfg.environment]}/v3${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: cfg.access_token,
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: AsaasError = { status: res.status, body };
    throw err;
  }
  return body as T;
}

// Status Asaas -> status interno da fatura
function mapStatus(s: string): string {
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(s)) return "paid";
  if (s === "OVERDUE") return "overdue";
  if (["REFUNDED", "REFUND_REQUESTED", "DELETED"].includes(s)) return "canceled";
  return "pending";
}

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

// Credenciais Asaas para handlers fora do GET (compra de tokens etc.)
async function getAsaas(admin: ReturnType<typeof createClient>): Promise<AsaasConfig> {
  const { data } = await admin
    .from("asaas_config")
    .select("access_token, environment, enabled_methods")
    .limit(1)
    .maybeSingle();
  return {
    access_token: data?.access_token ?? "",
    environment: data?.environment ?? "sandbox",
    enabled_methods: data?.enabled_methods ?? [],
  };
}

// Pagamento confirmado: avanca o vencimento +30 dias (a partir do
// maior entre vencimento e hoje) e zera o prazo extra concedido
async function advanceDueDate(admin: ReturnType<typeof createClient>, tenantId: string) {
  const { data: tenant } = await admin
    .from("tenants")
    .select("subscription_due_date")
    .eq("id", tenantId)
    .maybeSingle();
  const current = tenant?.subscription_due_date ? new Date(tenant.subscription_due_date) : new Date();
  const base = current > new Date() ? current : new Date();
  const nextDue = new Date(base.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  await admin
    .from("tenants")
    .update({ subscription_due_date: nextDue, subscription_extra_days: 0 })
    .eq("id", tenantId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: caller } = await admin
      .from("users")
      .select("id, tenant_id, role")
      .eq("id", authData.user.id)
      .single();
    if (!caller?.tenant_id) return json({ error: "no_tenant" }, 400);
    const tenantId = caller.tenant_id;

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, name, plan_id, asaas_customer_id, subscription_due_date, subscription_extra_days")
      .eq("id", tenantId)
      .single();

    const { data: plan } = tenant?.plan_id
      ? await admin.from("plans").select("id, name, price, features").eq("id", tenant.plan_id).single()
      : { data: null };

    const { data: config } = await admin
      .from("asaas_config")
      .select("access_token, environment, enabled_methods, subscription_grace_days")
      .limit(1)
      .maybeSingle();
    const asaasCfg: AsaasConfig = {
      access_token: config?.access_token ?? "",
      environment: config?.environment ?? "sandbox",
      enabled_methods: config?.enabled_methods ?? [],
    };
    const graceDays =
      (config?.subscription_grace_days ?? 7) + (tenant?.subscription_extra_days ?? 0);

    // Bloqueio: vencimento + carência global + prazo extra da empresa
    const subscriptionBlocked = !!tenant?.subscription_due_date &&
      new Date(tenant.subscription_due_date).getTime() + graceDays * 86400000 < Date.now();

    const listInvoices = async () => {
      const { data } = await admin
        .from("subscription_invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    };

    // ── GET: overview ──
    if (req.method === "GET") {
      // Confere faturas em aberto contra o Asaas: podem ter sido
      // pagas ou removidas manualmente no painel (404 → cancelada)
      if (asaasCfg.access_token) {
        const { data: openList } = await admin
          .from("subscription_invoices")
          .select("id, status, asaas_payment_id, plan_name, amount")
          .eq("tenant_id", tenantId)
          .in("status", ["pending", "overdue"]);
        for (const inv of (openList ?? []) as { id: string; status: string; asaas_payment_id: string; plan_name: string; amount: number }[]) {
          if (!inv.asaas_payment_id) continue;
          try {
            const p = await asaas<{ status: string; deleted?: boolean; paymentDate: string | null }>(
              asaasCfg, `/payments/${inv.asaas_payment_id}`,
            );
            // Removida manualmente no painel Asaas: retorna 200 + deleted=true
            if (p.deleted === true) {
              await admin
                .from("subscription_invoices")
                .update({ status: "canceled" })
                .eq("id", inv.id);
              continue;
            }
            const st = mapStatus(p.status);
            if (st !== inv.status) {
              await admin
                .from("subscription_invoices")
                .update({
                  status: st,
                  paid_at: st === "paid" ? (p.paymentDate ?? today()) : null,
                })
                .eq("id", inv.id);
              // Webhook nao configurado/falhou: avanca vencimento aqui
              if (st === "paid" && inv.status !== "paid") {
                await advanceDueDate(admin, tenantId);
                // Lanca a assinatura paga no financeiro da empresa
                const { data: existingTx } = await admin
                  .from("transactions")
                  .select("id")
                  .eq("ref", inv.id)
                  .maybeSingle();
                if (!existingTx) {
                  await admin.from("transactions").insert({
                    tenant_id: tenantId,
                    type: "income",
                    description: `Assinatura — ${inv.plan_name}`,
                    amount: inv.amount,
                    category: "Assinatura",
                    ref: inv.id,
                    status: "paid",
                    date: p.paymentDate ?? today(),
                  });
                }
              }
            }
          } catch (err) {
            if ((err as AsaasError)?.status === 404) {
              await admin
                .from("subscription_invoices")
                .update({ status: "canceled" })
                .eq("id", inv.id);
            }
          }
        }
      }

      const invoices = await listInvoices();
      const t = today();
      const subDue = tenant?.subscription_due_date ?? null;
      const invoiceOverdue = invoices.some(
        (i: { status: string; due_date: string }) =>
          (i.status === "pending" || i.status === "overdue") && i.due_date < t,
      );
      // Vencida: a partir do dia seguinte ao vencimento da assinatura
      const has_overdue = (!!subDue && subDue < t) || invoiceOverdue;
      // Vence hoje: badge âmbar no menu para o usuário se antecipar
      const due_today = subDue === t;
      return json({
        plan: plan
          ? { id: plan.id, name: plan.name, price: Number(plan.price), features: plan.features ?? [] }
          : null,
        tenant_name: tenant?.name ?? "",
        enabled_methods: asaasCfg.enabled_methods,
        asaas_configured: !!asaasCfg.access_token,
        subscription: {
          due_date: tenant?.subscription_due_date ?? null,
          grace_days: graceDays,
          blocked: subscriptionBlocked,
        },
        invoices,
        has_overdue,
        due_today,
      });
    }

    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // helper: busca fatura do tenant
    const getInvoice = async (id: string) => {
      const { data } = await admin
        .from("subscription_invoices")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    };

    const openInvoice = async () => {
      const { data } = await admin
        .from("subscription_invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    };

    const fetchPix = async (paymentId: string) => {
      try {
        const qr = await asaas<{ encodedImage: string; payload: string }>(
          asaasCfg, `/payments/${paymentId}/pixQrCode`,
        );
        return { encodedImage: qr.encodedImage, payload: qr.payload };
      } catch {
        return null;
      }
    };

    // ── POST create: cria cobranca da assinatura ──
    if (action === "create") {
      if (!asaasCfg.access_token) return json({ error: "asaas_not_configured" }, 400);
      const billingType = String(body.billing_type ?? "");
      if (!asaasCfg.enabled_methods.includes(billingType)) {
        return json({ error: "method_not_enabled" }, 403);
      }
      if (!plan) return json({ error: "no_plan" }, 400);

      // Idempotente: se ja existe fatura aberta, devolve ela
      const existing = await openInvoice();
      if (existing) {
        const pix = existing.billing_type === "PIX" && existing.asaas_payment_id
          ? await fetchPix(existing.asaas_payment_id)
          : null;
        if (pix?.payload) {
          await admin.from("subscription_invoices").update({ pix_payload: pix.payload }).eq("id", existing.id);
        }
        return json({ invoice: existing, reused: true, pix_encoded_image: pix?.encodedImage ?? null });
      }

      // Cliente Asaas (usa CNPJ da empresa)
      const { data: settings } = await admin
        .from("tenant_settings")
        .select("company_name, cnpj, phone, whatsapp")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      const cnpj = digits(settings?.cnpj);
      if (!cnpj) return json({ error: "cnpj_missing" }, 400);

      let customerId = tenant?.asaas_customer_id ?? "";
      if (!customerId) {
        const customer = await asaas<{ id: string }>(asaasCfg, "/customers", {
          method: "POST",
          body: JSON.stringify({
            name: settings?.company_name || tenant?.name,
            cpfCnpj: cnpj,
            mobilePhone: digits(settings?.whatsapp || settings?.phone) || undefined,
            externalReference: tenantId,
            notificationDisabled: false,
          }),
        });
        customerId = customer.id;
        await admin.from("tenants").update({ asaas_customer_id: customerId }).eq("id", tenantId);
      }

      const invoiceId = crypto.randomUUID();
      // Vencimento da cobrança = data de vencimento da assinatura da
      // empresa (fallback: +7 dias)
      const invoiceDueDate = tenant?.subscription_due_date ?? plusDays(7);
      const payment = await asaas<{
        id: string; invoiceUrl: string; bankSlipUrl: string | null;
      }>(asaasCfg, "/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: Number(plan.price),
          dueDate: invoiceDueDate,
          description: `Assinatura plano ${plan.name}`,
          externalReference: invoiceId,
        }),
      });

      const pix = billingType === "PIX" ? await fetchPix(payment.id) : null;

      const { data: invoice, error: insertErr } = await admin
        .from("subscription_invoices")
        .insert({
          id: invoiceId,
          tenant_id: tenantId,
          plan_id: plan.id,
          plan_name: plan.name,
          amount: Number(plan.price),
          billing_type: billingType,
          status: "pending",
          asaas_payment_id: payment.id,
          due_date: invoiceDueDate,
          invoice_url: payment.invoiceUrl,
          bank_slip_url: payment.bankSlipUrl,
          pix_payload: pix?.payload ?? null,
        })
        .select()
        .single();
      if (insertErr || !invoice) return json({ error: "insert_failed" }, 500);

      return json({ invoice, reused: false, pix_encoded_image: pix?.encodedImage ?? null });
    }

    // ── POST sync: consulta status no Asaas ──
    if (action === "sync") {
      const invoice = await getInvoice(String(body.invoice_id ?? ""));
      if (!invoice) return json({ error: "not_found" }, 404);
      if (!invoice.asaas_payment_id) return json({ error: "no_payment_id" }, 400);
      if (!asaasCfg.access_token) return json({ error: "asaas_not_configured" }, 400);

      const p = await asaas<{ status: string; deleted?: boolean; paymentDate: string | null; bankSlipUrl: string | null }>(
        asaasCfg, `/payments/${invoice.asaas_payment_id}`,
      );
      const status = p.deleted === true ? "canceled" : mapStatus(p.status);
      const { data: updated } = await admin
        .from("subscription_invoices")
        .update({
          status,
          paid_at: status === "paid" ? (p.paymentDate ?? today()) : null,
          bank_slip_url: p.bankSlipUrl ?? invoice.bank_slip_url,
        })
        .eq("id", invoice.id)
        .select()
        .single();
      return json({ invoice: updated });
    }

    // ── POST pix: QR Code de fatura aberta ──
    if (action === "pix") {
      const invoice = await getInvoice(String(body.invoice_id ?? ""));
      if (!invoice) return json({ error: "not_found" }, 404);
      if (!invoice.asaas_payment_id || !asaasCfg.access_token) {
        return json({ error: "asaas_not_configured" }, 400);
      }
      const pix = await fetchPix(invoice.asaas_payment_id);
      if (!pix) return json({ error: "pix_unavailable" }, 400);
      if (pix.payload) {
        await admin.from("subscription_invoices").update({ pix_payload: pix.payload }).eq("id", invoice.id);
      }
      return json({ encoded_image: pix.encodedImage, payload: pix.payload });
    }

    // ── POST tokens: compra de pacote de tokens de IA ──
    if (action === "buy_tokens") {
      if (!asaasCfg.access_token) return json({ error: "asaas_not_configured" }, 400);
      const packageId = String(body.package_id ?? "");

      const { data: pkg } = await admin
        .from("token_packages")
        .select("id, name, tokens, price")
        .eq("id", packageId)
        .eq("active", true)
        .maybeSingle();
      if (!pkg) return json({ error: "invalid_package" }, 400);

      // Cliente Asaas do tenant (reusa o da assinatura)
      const { data: tenant } = await admin
        .from("tenants")
        .select("asaas_customer_id")
        .eq("id", tenantId)
        .single();
      let customerId = tenant?.asaas_customer_id ?? "";
      const { data: settings } = await admin
        .from("tenant_settings")
        .select("company_name, cnpj, phone, whatsapp")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!customerId) {
        const cnpj = digits(settings?.cnpj);
        if (!cnpj) return json({ error: "cnpj_missing" }, 400);
        const customer = await asaas<{ id: string }>(asaasCfg, "/customers", {
          method: "POST",
          body: JSON.stringify({
            name: settings?.company_name || tenant?.name,
            cpfCnpj: cnpj,
            mobilePhone: digits(settings?.whatsapp || settings?.phone) || undefined,
            externalReference: tenantId,
          }),
        });
        customerId = customer.id;
        await admin.from("tenants").update({ asaas_customer_id: customerId }).eq("id", tenantId);
      }

      const purchaseId = crypto.randomUUID();
      const payment = await asaas<{ id: string; invoiceUrl: string; bankSlipUrl: string | null }>(
        asaasCfg, "/payments", {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "PIX",
            value: Number(pkg.price),
            dueDate: today(),
            description: `Pacote de tokens: ${pkg.name} (${pkg.tokens} tokens)`,
            externalReference: `tokens:${purchaseId}`,
          }),
        },
      );

      let pixImage: string | null = null;
      let pixPayload: string | null = null;
      try {
        const qr = await asaas<{ encodedImage: string; payload: string }>(
          asaasCfg, `/payments/${payment.id}/pixQrCode`,
        );
        pixImage = qr.encodedImage ?? null;
        pixPayload = qr.payload ?? null;
      } catch { /* melhor esforço */ }

      const { error: insErr } = await admin.from("token_purchases").insert({
        id: purchaseId,
        tenant_id: tenantId,
        package_id: pkg.id,
        package_name: pkg.name,
        tokens: pkg.tokens,
        amount: Number(pkg.price),
        status: "pending",
        asaas_payment_id: payment.id,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: payment.bankSlipUrl,
      });
      if (insErr) return json({ error: "purchase_failed" }, 500);

      return json({
        purchase: {
          id: purchaseId,
          package_name: pkg.name,
          tokens: pkg.tokens,
          amount: Number(pkg.price),
          invoice_url: payment.invoiceUrl,
          pix_payload: pixPayload,
        },
        pix_encoded_image: pixImage,
      });
    }

    // ── POST poll_tokens: status de compra de tokens ──
    if (action === "poll_tokens") {
      const { data: purchase } = await admin
        .from("token_purchases")
        .select("*")
        .eq("id", String(body.purchase_id ?? ""))
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!purchase) return json({ error: "not_found" }, 404);
      if (purchase.status === "paid") return json({ paid: true, tokens: purchase.tokens });
      if (!purchase.asaas_payment_id) return json({ paid: false });

      const asaasPollCfg = asaasCfg;
      try {
        const p = await asaas<{ status: string; deleted?: boolean; paymentDate: string | null }>(
          asaasPollCfg, `/payments/${purchase.asaas_payment_id}`,
        );
        const paid = p.deleted !== true && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status);
        if (paid) {
          // Credita o saldo e conclui a compra
          const { data: ent } = await admin
            .from("tenant_ai_entitlements")
            .select("id, extra_tokens")
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (ent) {
            await admin
              .from("tenant_ai_entitlements")
              .update({ extra_tokens: (ent.extra_tokens ?? 0) + purchase.tokens, updated_at: new Date().toISOString() })
              .eq("id", ent.id);
          } else {
            await admin
              .from("tenant_ai_entitlements")
              .insert({ tenant_id: tenantId, extra_tokens: purchase.tokens });
          }
          await admin
            .from("token_purchases")
            .update({ status: "paid" })
            .eq("id", purchase.id);
          return json({ paid: true, tokens: purchase.tokens });
        }
      } catch { /* segue nao-pago */ }
      return json({ paid: false });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    const e = err as AsaasError;
    if (e?.status) {
      return json({
        error: "asaas_error",
        detail: e.body?.errors?.[0]?.description ?? "Falha na comunicacao com o Asaas",
      }, 502);
    }
    return json({ error: (err as Error)?.message ?? "internal_error" }, 500);
  }
});
