import { supabase } from '@/lib/supabase';
import type { AgentPresentationStyle } from '@/lib/agent-presentation';

export interface OnboardingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  featured: boolean;
  /** Cota de tokens de IA do plano (0 = ilimitado) — Issue #98 */
  ai_token_limit?: number;
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

/** Como o agente se apresenta (fonte única: @/lib/agent-presentation). */
export type AgentPresentation = AgentPresentationStyle;

/** Config do agente escolhida na etapa "Configure seu agente de IA". */
export interface AgentSetupConfig {
  agent_name: string;
  agent_presentation: AgentPresentation;
  agent_greeting: boolean;
  agent_auto_schedule: boolean;
  agent_auto_os: boolean;
}

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

  /** Etapa "Configure seu agente de IA" (nome, tom e automações). */
  setAgent(token: string, config: AgentSetupConfig) {
    return call<{ ok: boolean }>({ action: 'set_agent', token, ...config });
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
      agent_configured?: boolean;
      agent_config?: AgentSetupConfig;
      credentials: OnboardingCredentials | null;
    }>({ action: 'status', token });
  }
}
