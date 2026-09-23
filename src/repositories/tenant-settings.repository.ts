import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

// Configurações chave-valor por tenant (tabela tenant_kv)
export class TenantSettingsRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getValue(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('tenant_kv')
      .select('value')
      .eq('tenant_id', this.tenantId)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Failed to read tenant_kv:', error.message);
      return null;
    }
    return data?.value ?? null;
  }

  async setValue(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_kv')
      .upsert(
        { tenant_id: this.tenantId, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id,key' },
      );

    if (error) throw error;
  }
}
