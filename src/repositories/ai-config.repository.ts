import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { AiConfig } from '@/types';

interface AiConfigFilters {
  provider?: string;
  active?: boolean;
}

export class AiConfigRepository extends BaseSupabaseRepository<AiConfig> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('ai_configs', tenantId);
  }

  async getById(id: string): Promise<AiConfig | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: AiConfigFilters): Promise<AiConfig[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<AiConfig>): Promise<AiConfig> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as AiConfig;
  }

  async update(id: string, data: Partial<AiConfig>): Promise<AiConfig> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as AiConfig;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getActive(): Promise<AiConfig | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('tenant_id', this.tenantId).eq('active', true).limit(1).single()
    );
  }

  async getByProvider(provider: string): Promise<AiConfig[]> {
    return this.getAll({ provider });
  }

  async setActive(id: string): Promise<void> {
    const configs = await this.getAll();
    for (const config of configs) {
      await this.update(config.id, { active: config.id === id } as Partial<AiConfig>);
    }
  }
}
