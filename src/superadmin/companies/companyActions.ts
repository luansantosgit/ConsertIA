import { supabase } from '@/lib/supabase';

interface ActionCredentials {
  email: string;
  password: string;
  kind: 'created' | 'reset' | 'finalized';
}

/** Cria tenant + admin via edge e devolve as credenciais geradas. */
export async function createCompany(form: {
  name?: string;
  adminEmail?: string;
  plan_id?: string;
  primaryColor?: string;
  subscription_due_date?: string | null;
  subscription_extra_days?: number;
}): Promise<ActionCredentials> {
  const { data, error } = await supabase.functions.invoke('superadmin-create-company', {
    body: {
      name: form.name,
      admin_email: form.adminEmail,
      plan_id: form.plan_id || null,
      theme_color: form.primaryColor || '#2563eb',
      subscription_due_date: form.subscription_due_date || null,
      subscription_extra_days: Number(form.subscription_extra_days) || 0,
    },
  });
  if (error || !data?.success) {
    throw new Error(String(data?.error ?? 'request_failed'));
  }
  return { email: data.email, password: data.password, kind: 'created' };
}

/** Regera a senha do admin de um tenant. */
export async function resetCompanyPassword(tenantId: string): Promise<ActionCredentials> {
  const { data, error } = await supabase.functions.invoke('superadmin-reset-password', {
    body: { tenant_id: tenantId },
  });
  if (error || !data?.password) {
    throw new Error(String(data?.error ?? 'request_failed'));
  }
  return { email: data.email, password: data.password, kind: 'reset' };
}

/** Conclui o wizard manualmente (pagamento direto): ativa tenant e cria admin. */
export async function finalizeCompanyWizard(
  tenantId: string,
  userEmail: string,
  planId: string,
): Promise<ActionCredentials> {
  const { data, error } = await supabase.functions.invoke('wizard-finalize', {
    body: { tenant_id: tenantId, user_email: userEmail, plan_id: planId },
  });
  if (error || !data?.success) {
    throw new Error(String(data?.error ?? error?.message ?? 'request_failed'));
  }
  return { email: data.email, password: data.password, kind: 'finalized' };
}
