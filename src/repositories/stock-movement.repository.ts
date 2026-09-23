import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { StockMovement, StockMovementType } from '@/types';

interface StockMovementFilters {
  product_id?: string;
  type?: StockMovementType;
  date_from?: string;
  date_to?: string;
}

export class StockMovementRepository extends BaseSupabaseRepository<StockMovement> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('stock_movements', tenantId);
  }

  async getById(id: string): Promise<StockMovement | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: StockMovementFilters): Promise<StockMovement[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<StockMovement>): Promise<StockMovement> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as StockMovement;
  }

  async update(id: string, data: Partial<StockMovement>): Promise<StockMovement> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as StockMovement;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByProductId(productId: string): Promise<StockMovement[]> {
    return this.getAll({ product_id: productId });
  }

  async getByType(type: StockMovementType): Promise<StockMovement[]> {
    return this.getAll({ type });
  }

  async getInbound(productId: string): Promise<StockMovement[]> {
    return this.getAll({ product_id: productId, type: 'in' });
  }

  async getOutbound(productId: string): Promise<StockMovement[]> {
    return this.getAll({ product_id: productId, type: 'out' });
  }

  async getByDateRange(dateFrom: string, dateTo: string): Promise<StockMovement[]> {
    return this.getAll({ date_from: dateFrom, date_to: dateTo });
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
