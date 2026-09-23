import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { AiQuoteSettings, AiDiagnosisSettings } from '@/types';

const DEFAULT_QUOTE_TEMPLATE = 'Olá, {cliente}! Segue o orçamento para o reparo do seu {aparelho}:\n\n🔧 Serviço: {servico}\n💰 Valor: {valor_total}\n\nPosso já agendar a manutenção para você. Para qual data você quer?';

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
    return (data as AiQuoteSettings) ?? {
      id: '',
      tenant_id: this.tenantId,
      labor_enabled: false,
      labor_mode: 'included',
      labor_type: 'fixed',
      labor_value: 0,
      quote_template: DEFAULT_QUOTE_TEMPLATE,
      created_at: '',
      updated_at: '',
    };
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

  async get(): Promise<AiDiagnosisSettings> {
    const { data, error } = await supabase
      .from('ai_diagnosis_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as AiDiagnosisSettings) ?? {
      id: '',
      tenant_id: this.tenantId,
      repair_mode: 'screen_only',
      glass_rules: null,
      created_at: '',
      updated_at: '',
    };
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
