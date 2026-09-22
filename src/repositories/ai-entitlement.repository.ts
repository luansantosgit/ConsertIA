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
}
