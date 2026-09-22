import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { AiAgentSettings } from '@/types';

const DEFAULTS: AiAgentSettings = {
  id: '',
  tenant_id: '',
  agent_name: 'Assistente',
  greeting_enabled: true,
  typing_simulation: true,
  active: false,
  post_handoff_behavior: 'continue',
  handoff_message: 'Um instante, nossos atendentes vão te chamar em breve!',
  transfer_message: 'Um dos especialistas da nossa equipe vai te atender em breve!',
  uncovered_transfer: true,
  auto_os_enabled: true,
  auto_schedule_enabled: true,
  openrouter_model: 'openai/gpt-4o-mini',
  own_api_key: undefined,
  created_at: '',
  updated_at: '',
};

export class AiAgentSettingsRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async get(): Promise<AiAgentSettings> {
    const { data, error } = await supabase
      .from('ai_agent_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...DEFAULTS, ...data } : { ...DEFAULTS };
  }

  async save(settings: Partial<AiAgentSettings>): Promise<AiAgentSettings> {
    const { data, error } = await supabase
      .from('ai_agent_settings')
      .upsert({ ...settings, tenant_id: this.tenantId }, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (error) throw error;
    return data as AiAgentSettings;
  }
}
