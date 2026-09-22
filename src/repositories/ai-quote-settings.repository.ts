import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { AiQuoteSettings, AiDiagnosisSettings } from '@/types';

export class AiQuoteSettingsRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async get(): Promise<AiQuoteSettings> {
    const { data, error } = await supabase
      .from('ai_quote_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as AiQuoteSettings;
  }

  async save(settings: Partial<AiQuoteSettings>): Promise<AiQuoteSettings> {
    const { data, error } = await supabase
      .from('ai_quote_settings')
      .upsert({ ...settings, tenant_id: this.tenantId }, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (error) throw error;
    return data as AiQuoteSettings;
  }
}

export class AiDiagnosisSettingsRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async get(): Promise<AiDiagnosisSettings | null> {
    const { data, error } = await supabase
      .from('ai_diagnosis_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as AiDiagnosisSettings | null;
  }

  async save(settings: Partial<AiDiagnosisSettings>): Promise<AiDiagnosisSettings> {
    const { data, error } = await supabase
      .from('ai_diagnosis_settings')
      .upsert({ ...settings, tenant_id: this.tenantId }, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (error) throw error;
    return data as AiDiagnosisSettings;
  }
}
