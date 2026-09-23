import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Equipment } from '@/types';

interface EquipmentFilters {
  search?: string;
  customer_id?: string;
  type?: string;
  brand?: string;
}

export class EquipmentRepository extends BaseSupabaseRepository<Equipment> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('equipment', tenantId);
  }

  async getById(id: string): Promise<Equipment | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: EquipmentFilters): Promise<Equipment[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`type.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.type) {
      query = query.ilike('type', `%${filters.type}%`);
    }

    if (filters?.brand) {
      query = query.ilike('brand', `%${filters.brand}%`);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<Equipment>): Promise<Equipment> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Equipment;
  }

  async update(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Equipment;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByCustomerId(customerId: string): Promise<Equipment[]> {
    return this.getAll({ customer_id: customerId });
  }

  async getByType(type: string): Promise<Equipment[]> {
    return this.getAll({ type });
  }

  async getByBrand(brand: string): Promise<Equipment[]> {
    return this.getAll({ brand });
  }

  async getBySerialNumber(serialNumber: string): Promise<Equipment | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('serial_number', serialNumber).eq('tenant_id', this.tenantId).single()
    );
  }

  async search(term: string): Promise<Equipment[]> {
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
