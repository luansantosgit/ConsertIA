import { supabase } from '@/lib/supabase';
import type { Plan } from '@/types';

interface PlanFilters {
  search?: string;
  active?: boolean;
}

export class PlanRepository {
  private tableName = 'plans';

  async getById(id: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Plan;
  }

  async getAll(filters?: PlanFilters): Promise<Plan[]> {
    let query = supabase.from(this.tableName).select('*');

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    const { data, error } = await query.order('price', { ascending: true });
    if (error || !data) return [];
    return data as Plan[];
  }

  async create(data: Partial<Plan>): Promise<Plan> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created as Plan;
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as Plan;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getBySlug(slug: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Plan;
  }

  async getActive(): Promise<Plan[]> {
    return this.getAll({ active: true });
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }
}
