import { supabase } from '@/lib/supabase';

export interface OnboardingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  featured: boolean;
}

export interface OnboardingPayment {
  billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  amount: number;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_payload: string | null;
  status?: string;
  due_date?: string;
}

export interface OnboardingCredentials {
  email: string;
  temp_password: string;
}

export type BillingMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

// invoke não devolve corpo em erro HTTP; lê do error.context
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('public-signup', { body });
  if (error) {
    const payload = { ...((data ?? {}) as Record<string, unknown>) };
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        Object.assign(payload, await ctx.json());
      } catch { /* mantém fallback */ }
    }
    const err = new Error(String(payload.error ?? 'request_failed')) as Error & { code?: string };
    err.code = String(payload.error ?? 'request_failed');
    throw err;
  }
  return data as T;
}

export class OnboardingRepository {
  getPlans() {
    return call<{ plans: OnboardingPlan[]; enabled_methods: BillingMethod[] }>({ action: 'plans' });
  }

  start(data: {
    lead_name: string; company_name: string; email: string;
    phone: string; whatsapp: string; cpf_cnpj: string;
    address: string;
  }) {
    return call<{ token: string; resumed?: boolean; expires_at?: string }>({ action: 'start', ...data });
  }

  setPlan(token: string, planId: string) {
    return call<{ plan: { id: string; name: string; price: number } }>({
      action: 'set_plan', token, plan_id: planId,
    });
  }

  connect(token: string) {
    return call<{ qr_code: string | null }>({ action: 'connect', token });
  }

  pollConnection(token: string) {
    return call<{ connected: boolean }>({ action: 'poll_connection', token });
  }

  syncHistory(token: string) {
    return call<{ synced: number; total: number }>({ action: 'sync_history', token });
  }

  createPayment(token: string, billing_type: string) {
    return call<{ payment: OnboardingPayment; pix_encoded_image?: string | null; reused?: boolean }>({
      action: 'create_payment', token, billing_type,
    });
  }

  getPix(token: string) {
    return call<{ encoded_image: string | null; payload: string | null }>({ action: 'pix', token });
  }

  pollPayment(token: string) {
    return call<{ paid: boolean; credentials?: OnboardingCredentials; canceled?: boolean }>({
      action: 'poll_payment', token,
    });
  }

  expirePayment(token: string) {
    return call<{ expires_at: string }>({ action: 'expire_payment', token });
  }

  status(token: string) {
    return call<{
      status: string;
      plan: OnboardingPlan | null;
      payment: OnboardingPayment | null;
      expires_at: string;
      company_name: string;
      credentials: OnboardingCredentials | null;
    }>({ action: 'status', token });
  }
}
