import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Customer } from '@/types';

interface CustomerFilters {
  search?: string;
  status?: string;
  city?: string;
  state?: string;
}

export class CustomerRepository extends BaseSupabaseRepository<Customer> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('customers', tenantId);
  }

  async getById(id: string): Promise<Customer | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: CustomerFilters): Promise<Customer[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%`);
    }

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters?.state) {
      query = query.eq('state', filters.state);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Customer;
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Customer;
  }

  async checkLinkedChat(customer: Customer): Promise<{ hasChat: boolean; messageCount: number }> {
    const phones = [customer.phone, customer.mobile].filter(Boolean) as string[];
    const conditions: string[] = [`customer_id.eq.${customer.id}`];
    for (const p of phones) {
      const clean = p.replace(/\D/g, '');
      if (clean) {
        conditions.push(`contact_phone.eq.${clean}`);
        const without55 = clean.startsWith('55') ? clean.slice(2) : clean;
        conditions.push(`contact_phone.eq.${without55}`);
        const with55 = clean.startsWith('55') ? clean : `55${clean}`;
        conditions.push(`contact_phone.eq.${with55}`);
      }
    }

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .or(conditions.join(','));

    if (!convs || convs.length === 0) return { hasChat: false, messageCount: 0 };

    const convIds = convs.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds);

    return { hasChat: true, messageCount: count ?? 0 };
  }

  async delete(id: string, cascadeChats: boolean = true): Promise<void> {
    const customer = await this.getById(id);
    if (customer && cascadeChats) {
      const phones = [customer.phone, customer.mobile].filter(Boolean) as string[];
      const conditions: string[] = [`customer_id.eq.${id}`];
      for (const p of phones) {
        const clean = p.replace(/\D/g, '');
        if (clean) {
          conditions.push(`contact_phone.eq.${clean}`);
          const without55 = clean.startsWith('55') ? clean.slice(2) : clean;
          conditions.push(`contact_phone.eq.${without55}`);
          const with55 = clean.startsWith('55') ? clean : `55${clean}`;
          conditions.push(`contact_phone.eq.${with55}`);
        }
      }

      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', this.tenantId)
        .or(conditions.join(','));

      if (convs && convs.length > 0) {
        const convIds = convs.map(c => c.id);
        await supabase.from('messages').delete().in('conversation_id', convIds);
        await supabase.from('conversations').delete().in('id', convIds);
      }

      await supabase
        .from('leads')
        .delete()
        .eq('tenant_id', this.tenantId)
        .or(conditions.join(','));
    } else {
      await supabase.from('conversations').update({ customer_id: null }).eq('customer_id', id);
      await supabase.from('leads').update({ customer_id: null }).eq('customer_id', id);
    }

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByEmail(email: string): Promise<Customer | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('email', email).eq('tenant_id', this.tenantId).single()
    );
  }

  async getByPhone(phone: string): Promise<Customer | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('phone', phone).eq('tenant_id', this.tenantId).single()
    );
  }

  async getByCpfCnpj(cpfCnpj: string): Promise<Customer | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('cpf_cnpj', cpfCnpj).eq('tenant_id', this.tenantId).single()
    );
  }

  async search(term: string): Promise<Customer[]> {
    return this.getAll({ search: term });
  }

  async getByCity(city: string): Promise<Customer[]> {
    return this.getAll({ city });
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
