import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { TenantTheme } from '@/types';

export class TenantThemeRepository extends BaseSupabaseRepository<TenantTheme> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('tenant_themes', tenantId);
  }

  async getById(id: string): Promise<TenantTheme | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('tenant_id', id).maybeSingle()
    );
  }

  async getAll(): Promise<TenantTheme[]> {
    return this.fetchMany(
      supabase.from(this.tableName).select('*').order('created_at', { ascending: false })
    );
  }

  async create(data: Partial<TenantTheme>): Promise<TenantTheme> {
    const targetTenantId = data.tenant_id || this.tenantId;
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: targetTenantId })
      .select()
      .single();

    if (error) throw error;
    return created as TenantTheme;
  }

  async update(id: string, data: Partial<TenantTheme>): Promise<TenantTheme> {
    const targetTenantId = id || data.tenant_id || this.tenantId;
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('tenant_id', targetTenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as TenantTheme;
  }

  async delete(id: string): Promise<void> {
    const targetTenantId = id || this.tenantId;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('tenant_id', targetTenantId);

    if (error) throw error;
  }

  async getByTenantId(tenantId: string): Promise<TenantTheme | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('tenant_id', tenantId).maybeSingle()
    );
  }

  async getOrCreate(tenantId: string): Promise<TenantTheme> {
    const existing = await this.getByTenantId(tenantId);
    if (existing) return existing;

    return this.create({ tenant_id: tenantId } as Partial<TenantTheme>);
  }

  async upsert(data: Partial<TenantTheme>): Promise<TenantTheme> {
    const targetTenantId = data.tenant_id || this.tenantId;
    const { data: upserted, error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          ...data,
          tenant_id: targetTenantId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return upserted as TenantTheme;
  }
}
