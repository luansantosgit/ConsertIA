import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { AiPreQuoteTemplate, AiDeviceCoverage } from '@/types';

export class AiPreQuoteTemplateRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getAll(): Promise<AiPreQuoteTemplate[]> {
    const { data, error } = await supabase
      .from('ai_pre_quote_templates')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AiPreQuoteTemplate[];
  }

  async create(template: Partial<AiPreQuoteTemplate>): Promise<AiPreQuoteTemplate> {
    const { data, error } = await supabase
      .from('ai_pre_quote_templates')
      .insert({ ...template, tenant_id: this.tenantId })
      .select()
      .single();
    if (error) throw error;
    return data as AiPreQuoteTemplate;
  }

  async update(id: string, template: Partial<AiPreQuoteTemplate>): Promise<AiPreQuoteTemplate> {
    const { data, error } = await supabase
      .from('ai_pre_quote_templates')
      .update({ ...template, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();
    if (error) throw error;
    return data as AiPreQuoteTemplate;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_pre_quote_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);
    if (error) throw error;
  }
}

export class AiDeviceCoverageRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getAll(): Promise<AiDeviceCoverage[]> {
    const { data, error } = await supabase
      .from('ai_device_coverage')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('device_type');
    if (error) throw error;
    return (data ?? []) as AiDeviceCoverage[];
  }

  async upsertRow(row: Partial<AiDeviceCoverage> & { device_type: string }): Promise<AiDeviceCoverage> {
    const { data, error } = await supabase
      .from('ai_device_coverage')
      .upsert({ ...row, tenant_id: this.tenantId }, { onConflict: 'tenant_id,device_type' })
      .select()
      .single();
    if (error) throw error;
    return data as AiDeviceCoverage;
  }

  async deleteRow(deviceType: string): Promise<void> {
    const { error } = await supabase
      .from('ai_device_coverage')
      .delete()
      .eq('tenant_id', this.tenantId)
      .eq('device_type', deviceType);
    if (error) throw error;
  }
}
