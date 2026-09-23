import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/types';

export class TenantRepository {
  private tableName = 'tenants';

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Tenant;
  }

  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Tenant[];
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created as Tenant;
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as Tenant;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getBySlug(slug: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Tenant;
  }

  async getActive(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Tenant[];
  }

  async search(term: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Tenant[];
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }
}
