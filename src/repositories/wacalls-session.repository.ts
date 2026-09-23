import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { WaCallsSession, WaCallsSessionStatus } from '@/types';

export class WaCallsSessionRepository extends BaseSupabaseRepository<WaCallsSession> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('wacalls_sessions', tenantId);
  }

  async getById(id: string): Promise<WaCallsSession | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(): Promise<WaCallsSession[]> {
    return this.fetchMany(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: false })
    );
  }

  async create(data: Partial<WaCallsSession>): Promise<WaCallsSession> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as WaCallsSession;
  }

  async update(id: string, data: Partial<WaCallsSession>): Promise<WaCallsSession> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as WaCallsSession;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByForkSessionId(forkSessionId: string): Promise<WaCallsSession | null> {
    return this.fetchSingle(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('fork_session_id', forkSessionId)
        .eq('tenant_id', this.tenantId)
        .single()
    );
  }

  async getByConnectionId(connectionId: string): Promise<WaCallsSession | null> {
    return this.fetchSingle(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('connection_id', connectionId)
        .eq('tenant_id', this.tenantId)
        .single()
    );
  }

  async updateStatus(
    id: string,
    status: WaCallsSessionStatus,
    jid?: string
  ): Promise<WaCallsSession> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (jid !== undefined) updateData.jid = jid;

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as WaCallsSession;
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
    return count ?? 0;
  }

  async countByStatus(status: WaCallsSessionStatus): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId)
      .eq('status', status);

    if (error) throw error;
    return count ?? 0;
  }
}
