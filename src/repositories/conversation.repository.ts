import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Conversation } from '@/types';

interface ConversationFilters {
  search?: string;
  status?: 'open' | 'closed';
  assigned_to?: string;
}

export class ConversationRepository extends BaseSupabaseRepository<Conversation> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('conversations', tenantId);
  }

  async getById(id: string): Promise<Conversation | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: ConversationFilters): Promise<Conversation[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.search) {
      query = query.or(`contact_phone.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    return this.fetchMany(query.order('last_message_at', { ascending: false }));
  }

  /**
   * Lista enxuta para a sidebar do atendimento: só as colunas exibidas,
   * ordenada por mais recente, com paginacao (limit/offset).
   * Campos completos (notes, ai_suggestion...) viram via getById ao selecionar.
   */
  async getForSidebar(limit = 200, offset = 0): Promise<Conversation[]> {
    return this.fetchMany(
      supabase
        .from(this.tableName)
        .select('id, tenant_id, customer_id, contact_phone, contact_name, contact_avatar, unread_count, status, pinned, is_group, remote_jid, ai_state, assigned_to, last_message, last_message_at, created_at, updated_at')
        .eq('tenant_id', this.tenantId)
        .order('pinned', { ascending: false, nullsFirst: false })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)
    );
  }

  async create(data: Partial<Conversation>): Promise<Conversation> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Conversation;
  }

  async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Conversation;
  }

  async delete(id: string): Promise<void> {
    await supabase.from('messages').delete().eq('conversation_id', id);
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getOpen(): Promise<Conversation[]> {
    return this.getAll({ status: 'open' });
  }

  async getClosed(): Promise<Conversation[]> {
    return this.getAll({ status: 'closed' });
  }

  async getByContactPhone(phone: string): Promise<Conversation | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('contact_phone', phone).eq('tenant_id', this.tenantId).order('created_at', { ascending: false }).limit(1).single()
    );
  }

  async getByAssignedTo(userId: string): Promise<Conversation[]> {
    return this.getAll({ assigned_to: userId });
  }

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId)
      .gt('unread_count', 0);

    if (error) throw error;
    return count ?? 0;
  }

  async markAsRead(id: string): Promise<void> {
    await this.update(id, { unread_count: 0 } as Partial<Conversation>);
  }

  async markAsUnread(id: string): Promise<void> {
    await this.update(id, { unread_count: 1 } as Partial<Conversation>);
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    await this.update(id, { pinned } as Partial<Conversation>);
  }

  async close(id: string): Promise<Conversation> {
    return this.update(id, { status: 'closed' } as Partial<Conversation>);
  }

  async reopen(id: string): Promise<Conversation> {
    return this.update(id, { status: 'open' } as Partial<Conversation>);
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
