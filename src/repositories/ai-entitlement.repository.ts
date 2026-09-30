import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { TenantAiEntitlement, AiTokenUsage } from '@/types';

export class AiEntitlementRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getEntitlement(): Promise<TenantAiEntitlement | null> {
    const { data, error } = await supabase
      .from('tenant_ai_entitlements')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as TenantAiEntitlement | null;
  }

  async getUsage(period?: string): Promise<AiTokenUsage | null> {
    const month = period ?? new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('period', month)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as AiTokenUsage | null;
  }

  async getPlanLimit(): Promise<number> {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_id')
      .eq('id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (tenantError || !tenant?.plan_id) return 0;
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('ai_token_limit')
      .eq('id', tenant.plan_id)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    return plan?.ai_token_limit ?? 0;
  }

  async getEffectiveModels(): Promise<{ allowedModels: string[]; defaultModel: string }> {
    try {
      const [{ data: globalCfg }, entitlement] = await Promise.all([
        supabase.from('v_ai_model_options').select('distribution_mode, allowed_models, default_model').limit(1).maybeSingle(),
        this.getEntitlement(),
      ]);
      const source = globalCfg?.distribution_mode === 'all' ? globalCfg : entitlement;
      const allowed = (source?.allowed_models ?? []) as string[];
      const defaultModel = (source?.default_model ?? '') as string;
      return {
        allowedModels: allowed.filter((m): m is string => typeof m === 'string'),
        defaultModel: allowed.includes(defaultModel) ? defaultModel : allowed[0] ?? '',
      };
    } catch {
      return { allowedModels: [], defaultModel: '' };
    }
  }
}
