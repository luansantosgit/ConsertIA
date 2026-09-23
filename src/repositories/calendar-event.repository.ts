import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { CalendarEvent, CalendarEventType } from '@/types';

interface CalendarEventFilters {
  search?: string;
  type?: CalendarEventType;
  date_from?: string;
  date_to?: string;
  os_id?: string;
}

export class CalendarEventRepository extends BaseSupabaseRepository<CalendarEvent> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('calendar_events', tenantId);
  }

  async getById(id: string): Promise<CalendarEvent | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: CalendarEventFilters): Promise<CalendarEvent[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to);
    }

    if (filters?.os_id) {
      query = query.eq('os_id', filters.os_id);
    }

    return this.fetchMany(query.order('date', { ascending: true }).order('start_time', { ascending: true }));
  }

  async create(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as CalendarEvent;
  }

  async update(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as CalendarEvent;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByDateRange(dateFrom: string, dateTo: string): Promise<CalendarEvent[]> {
    return this.getAll({ date_from: dateFrom, date_to: dateTo });
  }

  async getByType(eventType: CalendarEventType): Promise<CalendarEvent[]> {
    return this.getAll({ type: eventType });
  }

  async getUpcoming(): Promise<CalendarEvent[]> {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return this.getAll({ date_from: todayStr });
  }

  async getForServiceOrder(serviceOrderId: string): Promise<CalendarEvent[]> {
    return this.getAll({ os_id: serviceOrderId, type: 'os' });
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
