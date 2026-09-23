import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Product } from '@/types';

interface ProductFilters {
  search?: string;
  active?: boolean;
  low_stock?: boolean;
}

export class ProductRepository extends BaseSupabaseRepository<Product> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('products', tenantId);
  }

  async getById(id: string): Promise<Product | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: ProductFilters): Promise<Product[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    return this.fetchMany(query.order('name', { ascending: true }));
  }

  async create(data: Partial<Product>): Promise<Product> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Product;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getBySku(sku: string): Promise<Product | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('sku', sku).eq('tenant_id', this.tenantId).single()
    );
  }

  async getActive(): Promise<Product[]> {
    return this.getAll({ active: true });
  }

  async getLowStock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('active', true)
      .filter('stock_quantity', 'lte', 'min_stock_quantity');

    if (error || !data) return [];
    return data as Product[];
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.getById(id);
    if (!product) throw new Error('Product not found');

    return this.update(id, { stock_quantity: product.stock_quantity + quantity } as Partial<Product>);
  }

  async search(term: string): Promise<Product[]> {
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
}
