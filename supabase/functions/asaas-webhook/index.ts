// ============================================================
// asaas-webhook — recebe eventos de cobranca do Asaas.
// Deploy SEMPRE com: supabase functions deploy asaas-webhook --no-verify-jwt
//
// Payload: { event: 'PAYMENT_RECEIVED' | ..., payment: {...} }
// Docs: docs.asaas.com/docs/webhook-para-cobrancas
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { finalizeOnboarding, type OnboardingSession } from "../_shared/onboarding.ts";
import { finalizeOnboarding, type OnboardingSession } from "../_shared/onboarding.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function mapStatus(s: string): string {
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(s)) return "paid";
  if (s === "OVERDUE") return "overdue";
  if (["REFUNDED", "REFUND_REQUESTED", "DELETED"].includes(s)) return "canceled";
  return "pending";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  // Asaas so envia POST; responde 200 rapido para nao gerar retry
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const payment = body?.payment;
    if (!payment?.id) return json({ received: true });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: invoice } = await admin
      .from("subscription_invoices")
      .select("id, tenant_id, status, plan_name, amount")
      .eq("asaas_payment_id", String(payment.id))
      .maybeSingle();
    if (!invoice) return json({ received: true });

    const status = mapStatus(String(payment.status ?? ""));
    if (status !== invoice.status) {
      const paidAt = status === "paid"
        ? (payment.paymentDate ?? new Date().toISOString().slice(0, 10))
        : null;
      await admin
        .from("subscription_invoices")
        .update({
          status,
          paid_at: paidAt,
        })
        .eq("id", invoice.id);

      // Pagamento confirmado: avanca o vencimento da assinatura em 1 mes
      // (a partir do maior entre vencimento e hoje) e zera o prazo extra
      if (status === "paid") {
        const { data: tenant } = await admin
          .from("tenants")
          .select("subscription_due_date")
          .eq("id", invoice.tenant_id)
          .maybeSingle();
        const current = tenant?.subscription_due_date
          ? new Date(tenant.subscription_due_date)
          : new Date();
        const today = new Date();
        const base = current > today ? current : today;
        const nextDue = new Date(base.getTime() + 30 * 86400000)
          .toISOString()
          .slice(0, 10);
        await admin
          .from("tenants")
          .update({ subscription_due_date: nextDue, subscription_extra_days: 0 })
          .eq("id", invoice.tenant_id);

        // Lanca a assinatura paga no financeiro da empresa (sem duplicar)
        const { data: existing } = await admin
          .from("transactions")
          .select("id")
          .eq("ref", invoice.id)
          .maybeSingle();
        if (!existing) {
          await admin.from("transactions").insert({
            tenant_id: invoice.tenant_id,
            type: "income",
            description: `Assinatura — ${invoice.plan_name}`,
            amount: invoice.amount,
            category: "Assinatura",
            ref: invoice.id,
            status: "paid",
            date: paidAt ?? new Date().toISOString().slice(0, 10),
          });
        }
      }
    }

    // Onboarding público (/comece-agora): pagamento confirmado →
    // ativa a empresa, cria o admin e libera o painel
    {
      const { data: onb } = await admin
        .from("onboarding_sessions")
        .select("*")
        .eq("asaas_payment_id", String(payment.id))
        .maybeSingle();
      if (onb && onb.status !== "paid" && String(payment.status ?? "") !== "DELETED") {
        await finalizeOnboarding(admin, onb as OnboardingSession, payment.paymentDate ?? null);
      }
    }
    return json({ received: true });
  } catch {
    // Sempre 200 para o Asaas nao entrar em retry infinito
    return json({ received: true });
  }
});
