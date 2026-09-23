import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Transaction, TransactionType, TransactionStatus } from '@/types';

interface TransactionFilters {
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  service_order_id?: string;
  date_from?: string;
  date_to?: string;
}

export class TransactionRepository extends BaseSupabaseRepository<Transaction> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('transactions', tenantId);
  }

  async getById(id: string): Promise<Transaction | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.service_order_id) {
      query = query.eq('service_order_id', filters.service_order_id);
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Transaction;
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Transaction;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  // Remocao em massa (uma unica query)
  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .in('id', ids)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByServiceOrderId(serviceOrderId: string): Promise<Transaction[]> {
    return this.getAll({ service_order_id: serviceOrderId });
  }

  async getByType(type: TransactionType): Promise<Transaction[]> {
    return this.getAll({ type });
  }

  async getByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return this.getAll({ status });
  }

  async getByDateRange(dateFrom: string, dateTo: string): Promise<Transaction[]> {
    return this.getAll({ date_from: dateFrom, date_to: dateTo });
  }

  async getTotalIncome(dateFrom?: string, dateTo?: string): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('amount')
      .eq('tenant_id', this.tenantId)
      .eq('type', 'income')
      .eq('status', 'completed');

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;
    if (error || !data) return 0;
    return data.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  async getTotalExpenses(dateFrom?: string, dateTo?: string): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('amount')
      .eq('tenant_id', this.tenantId)
      .eq('type', 'expense')
      .eq('status', 'completed');

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;
    if (error || !data) return 0;
    return data.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
    return count ?? 0;
  }
}
