import { supabase } from '@/lib/supabase';
import type { ConversationHybridState, HybridProvider } from '@/types';

export class ConversationHybridStateRepository {
  private tableName = 'conversation_hybrid_state';

  constructor() {}

  async getByConversationId(conversationId: string): Promise<ConversationHybridState | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (error || !data) return null;
    return data as ConversationHybridState;
  }

  async getOrCreate(
    conversationId: string,
    randomPercentage: number
  ): Promise<HybridProvider> {
    const existing = await this.getByConversationId(conversationId);

    if (existing?.provider_override) {
      return existing.provider_override;
    }

    const provider: HybridProvider =
      Math.random() * 100 < randomPercentage ? 'api_oficial' : 'api_alternativa';

    const { error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          conversation_id: conversationId,
          provider_override: provider,
          first_response_sent: false,
        },
        { onConflict: 'conversation_id' }
      );

    if (error) throw error;
    return provider;
  }

  async markFirstResponseSent(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ first_response_sent: true })
      .eq('conversation_id', conversationId);

    if (error) throw error;
  }

  async isFirstResponseSent(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('first_response_sent')
      .eq('conversation_id', conversationId)
      .single();

    if (error || !data) return false;
    return Boolean(data.first_response_sent);
  }

  async upsert(data: Partial<ConversationHybridState>): Promise<ConversationHybridState> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .upsert(data, { onConflict: 'conversation_id' })
      .select()
      .single();

    if (error) throw error;
    return created as ConversationHybridState;
  }

  async delete(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('conversation_id', conversationId);

    if (error) throw error;
  }
}
