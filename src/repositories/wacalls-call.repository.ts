import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { WaCallsCall, WaCallsCallStatus, WaCallsCallDirection } from '@/types';

interface WaCallsCallFilters {
  session_id?: string;
  status?: WaCallsCallStatus;
  direction?: WaCallsCallDirection;
  date_from?: string;
  date_to?: string;
}

export class WaCallsCallRepository extends BaseSupabaseRepository<WaCallsCall> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('wacalls_calls', tenantId);
  }

  async getById(id: string): Promise<WaCallsCall | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: WaCallsCallFilters): Promise<WaCallsCall[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.session_id) {
      query = query.eq('session_id', filters.session_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.direction) {
      query = query.eq('direction', filters.direction);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<WaCallsCall>): Promise<WaCallsCall> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as WaCallsCall;
  }

  async update(id: string, data: Partial<WaCallsCall>): Promise<WaCallsCall> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as WaCallsCall;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getBySessionId(sessionId: string): Promise<WaCallsCall[]> {
    return this.getAll({ session_id: sessionId });
  }

  async getActiveCalls(sessionId: string): Promise<WaCallsCall[]> {
    return this.getAll({ session_id: sessionId, status: 'active' });
  }

  async getCallsToday(sessionId: string): Promise<WaCallsCall[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getAll({
      session_id: sessionId,
      date_from: today.toISOString(),
    });
  }

  async countActiveCalls(sessionId: string): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId)
      .eq('session_id', sessionId)
      .eq('status', 'active');

    if (error) throw error;
    return count ?? 0;
  }

  async countCallsToday(sessionId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId)
      .eq('session_id', sessionId)
      .gte('created_at', today.toISOString());

    if (error) throw error;
    return count ?? 0;
  }

  async endCall(id: string, durationSeconds: number, recordingUrl?: string): Promise<WaCallsCall> {
    const updateData: Record<string, any> = {
      status: 'ended',
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    };

    if (recordingUrl !== undefined) updateData.recording_url = recordingUrl;

    return this.update(id, updateData);
  }
}
