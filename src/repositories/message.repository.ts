import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { Message } from '@/types';

interface MessageFilters {
  conversation_id?: string;
  direction?: 'inbound' | 'outbound';
  read?: boolean;
}

export class MessageRepository extends BaseSupabaseRepository<Message> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('messages', tenantId);
  }

  async getById(id: string): Promise<Message | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: MessageFilters): Promise<Message[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.conversation_id) {
      query = query.eq('conversation_id', filters.conversation_id);
    }

    if (filters?.direction) {
      query = query.eq('direction', filters.direction);
    }

    if (filters?.read !== undefined) {
      query = query.eq('read', filters.read);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async getAiConversationIds(dateFrom?: string, dateTo?: string): Promise<string[]> {
    let query = supabase
      .from(this.tableName)
      .select('conversation_id')
      .eq('tenant_id', this.tenantId)
      .eq('sender_type', 'ai');

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lt('created_at', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return [...new Set((data ?? []).map((r) => r.conversation_id).filter((id): id is string => !!id))];
  }

  async create(data: Partial<Message>): Promise<Message> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as Message;
  }

  async update(id: string, data: Partial<Message>): Promise<Message> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as Message;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByConversationId(conversationId: string): Promise<Message[]> {
    return this.getAll({ conversation_id: conversationId });
  }

  async getUnreadByConversationId(conversationId: string): Promise<Message[]> {
    return this.getAll({ conversation_id: conversationId, read: false });
  }

  async getInbound(conversationId: string): Promise<Message[]> {
    return this.getAll({ conversation_id: conversationId, direction: 'inbound' });
  }

  async getOutbound(conversationId: string): Promise<Message[]> {
    return this.getAll({ conversation_id: conversationId, direction: 'outbound' });
  }

  async markAsRead(id: string): Promise<void> {
    await this.update(id, { read: true } as Partial<Message>);
  }

  async markAllAsRead(conversationId: string): Promise<void> {
    const unread = await this.getUnreadByConversationId(conversationId);
    for (const msg of unread) {
      await this.markAsRead(msg.id);
    }
  }

  async getLatestByConversationId(conversationId: string): Promise<Message | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('conversation_id', conversationId).eq('tenant_id', this.tenantId).order('created_at', { ascending: false }).limit(1).single()
    );
  }
}
