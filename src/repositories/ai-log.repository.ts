import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { AiLog } from '@/types';

interface AiLogFilters {
  conversation_id?: string;
  provider?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
}

export class AiLogRepository extends BaseSupabaseRepository<AiLog> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('ai_logs', tenantId);
  }

  async getById(id: string): Promise<AiLog | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).eq('tenant_id', this.tenantId).single()
    );
  }

  async getAll(filters?: AiLogFilters): Promise<AiLog[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filters?.conversation_id) {
      query = query.eq('conversation_id', filters.conversation_id);
    }
    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.success !== undefined) {
      query = query.eq('success', filters.success);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    return this.fetchMany(query.order('created_at', { ascending: false }));
  }

  async create(data: Partial<AiLog>): Promise<AiLog> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select()
      .single();

    if (error) throw error;
    return created as AiLog;
  }

  async update(id: string, data: Partial<AiLog>): Promise<AiLog> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated as AiLog;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async getByConversationId(conversationId: string): Promise<AiLog[]> {
    return this.getAll({ conversation_id: conversationId });
  }

  async getErrors(): Promise<AiLog[]> {
    return this.getAll({ success: false });
  }

  async getTotalCost(dateFrom?: string, dateTo?: string): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('cost')
      .eq('tenant_id', this.tenantId);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;
    if (error || !data) return 0;
    return data.reduce((sum, log) => sum + (log.cost || 0), 0);
  }

  async getTotalTokens(dateFrom?: string, dateTo?: string): Promise<{ input: number; output: number }> {
    let query = supabase
      .from(this.tableName)
      .select('input_tokens, output_tokens')
      .eq('tenant_id', this.tenantId);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;
    if (error || !data) return { input: 0, output: 0 };
    return {
      input: data.reduce((sum, log) => sum + (log.input_tokens || 0), 0),
      output: data.reduce((sum, log) => sum + (log.output_tokens || 0), 0),
    };
  }

  async getAverageResponseTime(): Promise<number> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('response_time_ms')
      .eq('tenant_id', this.tenantId);

    if (error || !data || data.length === 0) return 0;
    return data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / data.length;
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
