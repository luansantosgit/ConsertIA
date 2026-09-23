import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Lead, LeadStatus } from '@/types';

interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  source?: string;
}

export class LeadRepository extends BaseSupabaseRepository<Lead> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('leads', tenantId);
  }

  async getById(id: string): Promise<Lead | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: LeadFilters): Promise<Lead[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Lead;
  }

  async update(id: string, data: Partial<Lead>): Promise<Lead> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Lead;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByStatus(status: LeadStatus): Promise<Lead[]> {
    return this.getAll({ status });
  }

  async getNew(): Promise<Lead[]> {
    return this.getAll({ status: 'new' });
  }

  async getConverted(): Promise<Lead[]> {
    return this.getAll({ status: 'converted' });
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    return this.update(id, { status } as Partial<Lead>);
  }

  async search(term: string): Promise<Lead[]> {
    return this.getAll({ search: term });
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
    return count ?? 0;
  }

  async countByStatus(): Promise<Record<LeadStatus, number>> {
    const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .eq('status', status);

      counts[status] = count ?? 0;
    }

    return counts as Record<LeadStatus, number>;
  }
}
