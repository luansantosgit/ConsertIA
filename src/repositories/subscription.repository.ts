import { supabase } from '@/lib/supabase';

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export const BILLING_LABELS: Record<BillingType, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
};

export interface SubscriptionInvoice {
  id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  billing_type: BillingType;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  due_date: string;
  paid_at: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_payload: string | null;
  created_at: string;
}

export interface SubscriptionOverview {
  plan: { id: string; name: string; price: number; features: string[] } | null;
  tenant_name: string;
  enabled_methods: BillingType[];
  asaas_configured: boolean;
  subscription: { due_date: string | null; grace_days: number; blocked: boolean };
  invoices: SubscriptionInvoice[];
  has_overdue: boolean;
  due_today: boolean;
}

export interface CreateInvoiceResult {
  invoice: SubscriptionInvoice;
  reused: boolean;
  pix_encoded_image: string | null;
}

// invoke não devolve corpo em erro HTTP; lê do error.context (FunctionsHttpError)
async function call<T>(method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('asaas-subscriptions', {
    method,
    body: body as Record<string, unknown>,
  });
  if (error) {
    const payload = { ...((data ?? {}) as Record<string, unknown>) };
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        Object.assign(payload, await ctx.json());
      } catch { /* mantém fallback */ }
    }
    const err = new Error(String(payload.error ?? 'request_failed')) as Error & {
      code?: string;
      detail?: string;
    };
    err.code = String(payload.error ?? 'request_failed');
    err.detail = payload.detail ? String(payload.detail) : undefined;
    throw err;
  }
  return data as T;
}

export class SubscriptionRepository {
  getOverview(): Promise<SubscriptionOverview> {
    return call<SubscriptionOverview>('GET');
  }

  createInvoice(billingType: BillingType): Promise<CreateInvoiceResult> {
    return call<CreateInvoiceResult>('POST', { action: 'create', billing_type: billingType });
  }

  syncInvoice(invoiceId: string): Promise<{ invoice: SubscriptionInvoice }> {
    return call('POST', { action: 'sync', invoice_id: invoiceId });
  }

  getPixQr(invoiceId: string): Promise<{ encoded_image: string; payload: string }> {
    return call('POST', { action: 'pix', invoice_id: invoiceId });
  }
}
