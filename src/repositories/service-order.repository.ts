import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import { CustomerRepository } from './customer.repository';
import type { ServiceOrder, ServiceOrderStatus, ChecklistPhoto, Customer } from '@/types';

interface ServiceOrderFilters {
  search?: string;
  status?: ServiceOrderStatus;
  priority?: string;
  customer_id?: string;
  technician_id?: string;
}

export interface ServiceOrderForm {
  customerId?: string;
  customerName: string;
  subject: string;
  description?: string;
  budgetAmount?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  checklistPhotos?: ChecklistPhoto[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ServiceOrderRepository extends BaseSupabaseRepository<ServiceOrder> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('service_orders', tenantId);
  }

  async getById(id: string): Promise<ServiceOrder | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: ServiceOrderFilters): Promise<ServiceOrder[]> {
    let query = supabase
      .from(this.tableName)
      .select('*, customer:customers(name, phone, mobile, conversations:conversations(id, contact_avatar, contact_name)), equipment:equipment(type, brand, model)')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.technician_id) {
      query = query.eq('technician_id', filters.technician_id);
    }

    const rows = await this.fetchMany(query.order('created_at', { ascending: false }));
    return rows.map((row) => {
      const r = row as ServiceOrder & {
        customer?: {
          name?: string;
          phone?: string;
          mobile?: string;
          conversations?: { id: string; contact_avatar?: string; contact_name?: string }[];
        } | null;
        equipment?: { type?: string; brand?: string; model?: string } | null;
      };
      const conversation = r.customer?.conversations?.[0];
      return {
        ...r,
        customerName: r.customer?.name || '',
        customerPhone: r.customer?.phone || r.customer?.mobile || '',
        conversationId: conversation?.id || '',
        contactAvatar: conversation?.contact_avatar || '',
        equipmentLabel: r.equipment
          ? [r.equipment.brand, r.equipment.model].filter(Boolean).join(' ') || r.equipment.type || ''
          : '',
      } as unknown as ServiceOrder;
    });
  }

  async create(data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as ServiceOrder;
  }

  // Cria OS a partir do formulario, resolvendo/criando o cliente pelo nome
  async createFromForm(form: ServiceOrderForm): Promise<ServiceOrder> {
    const customerRepo = new CustomerRepository();
    let customerId = form.customerId && UUID_RE.test(form.customerId) ? form.customerId : undefined;

    if (!customerId) {
      const term = form.customerName.trim();
      if (!term) throw new Error('Nome do cliente e obrigatorio.');
      const found = await customerRepo.search(term);
      const exact = found.find((c: Customer) => c.name.trim().toLowerCase() === term.toLowerCase());
      if (exact) {
        customerId = exact.id;
      } else {
        const created = await customerRepo.create({ name: term });
        customerId = created.id;
      }
    }

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: this.tenantId,
        customer_id: customerId,
        status: 'pending',
        subject: form.subject,
        description: form.description || null,
        budget_amount: form.budgetAmount ?? null,
        priority: form.priority,
        checklist_photos: form.checklistPhotos || [],
      })
      .select()
      .single();

    if (error) throw error;
    return created as ServiceOrder;
  }

  async update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as ServiceOrder;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByCustomerId(customerId: string): Promise<ServiceOrder[]> {
    return this.getAll({ customer_id: customerId });
  }

  async getByTechnicianId(technicianId: string): Promise<ServiceOrder[]> {
    return this.getAll({ technician_id: technicianId });
  }

  async getByStatus(status: ServiceOrderStatus): Promise<ServiceOrder[]> {
    return this.getAll({ status });
  }

  async getByPriority(priority: string): Promise<ServiceOrder[]> {
    return this.getAll({ priority });
  }

  async updateStatus(id: string, status: ServiceOrderStatus): Promise<ServiceOrder> {
    return this.update(id, { status } as Partial<ServiceOrder>);
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
    return count ?? 0;
  }

  async countByStatus(): Promise<Record<ServiceOrderStatus, number>> {
    const statuses: ServiceOrderStatus[] = [
      'pending', 'diagnosis', 'awaiting_approval', 'approved',
      'awaiting_part', 'in_progress', 'completed', 'ready', 'cancelled'
    ];

    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .eq('status', status);

      counts[status] = count ?? 0;
    }

    return counts as Record<ServiceOrderStatus, number>;
  }
}
