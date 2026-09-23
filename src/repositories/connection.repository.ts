import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Connection, ConnectionProvider, ConnectionStatus } from '@/types';

interface ConnectionFilters {
  search?: string;
  provider?: ConnectionProvider;
  status?: ConnectionStatus;
}

export class ConnectionRepository extends BaseSupabaseRepository<Connection> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('connections', tenantId);
  }

  async getById(id: string): Promise<Connection | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: ConnectionFilters): Promise<Connection[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
    }

    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<Connection>): Promise<Connection> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Connection;
  }

  async update(id: string, data: Partial<Connection>): Promise<Connection> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Connection;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByProvider(provider: ConnectionProvider): Promise<Connection[]> {
    return this.getAll({ provider });
  }

  async getActive(): Promise<Connection[]> {
    return this.getAll({ status: 'connected' });
  }

  async updateStatus(
    id: string,
    status: ConnectionStatus,
    profileName?: string,
    profilePicUrl?: string,
    instanceToken?: string,
    instanceData?: Record<string, any>,
    number?: string
  ): Promise<Connection> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (profileName !== undefined) updateData.profile_name = profileName;
    if (profilePicUrl !== undefined) updateData.profile_pic_url = profilePicUrl;
    if (instanceToken !== undefined) updateData.instance_token = instanceToken;
    if (instanceData !== undefined) updateData.instance_data = instanceData;
    if (number !== undefined) updateData.number = number;

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Connection;
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
    return count ?? 0;
  }

  async countByProvider(provider: ConnectionProvider): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId)
      .eq('provider', provider);

    if (error) throw error;
    return count ?? 0;
  }

  subscribeToChanges(callback: () => void) {
    return supabase
      .channel('connections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: this.tableName }, () => {
        callback();
      })
      .subscribe();
  }
}
