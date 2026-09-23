import { supabase } from './supabase';
import type { HybridMode, HybridProvider, HybridRouteResult, Connection } from '@/types';

interface HybridConfig {
  hybridMode: HybridMode;
  hybridRandomPercentage: number;
}

export const hybridService = {
  async getConfig(): Promise<HybridConfig> {
    const { data } = await supabase
      .from('platform_settings')
      .select('id, hybrid_mode, hybrid_random_percentage')
      .limit(1)
      .maybeSingle();

    return {
      hybridMode: (data as any)?.hybrid_mode || 'integral',
      hybridRandomPercentage: Number((data as any)?.hybrid_random_percentage) || 50,
    };
  },

  async updateConfig(mode: HybridMode, percentage?: number): Promise<void> {
    // Buscar row existente
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const updateData: Record<string, any> = {
      hybrid_mode: mode,
      updated_at: new Date().toISOString(),
    };

    if (percentage !== undefined) {
      updateData.hybrid_random_percentage = percentage;
    }

    if (existing?.id) {
      // Atualizar row existente
      const { error } = await supabase
        .from('platform_settings')
        .update(updateData)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Criar nova row
      const { error } = await supabase
        .from('platform_settings')
        .insert(updateData);
      if (error) throw error;
    }
  },

  async resolveRoute(params: {
    connection: Connection;
    conversationId: string;
    isFirstResponse?: boolean;
  }): Promise<HybridRouteResult> {
    const { connection, conversationId, isFirstResponse } = params;

    // Se a conexao nao e hibrida, usa o provider dela
    if (connection.provider === 'api_alternativa') {
      return { provider: 'api_alternativa', reason: 'connection_is_api_alternativa' };
    }

    // Se e API Oficial pura
    if (connection.provider === 'api_oficial' && !connection.hybrid_connection_id) {
      return { provider: 'api_oficial', reason: 'connection_is_api_oficial' };
    }

    // Modo hibrido
    const config = await this.getConfig();

    if (config.hybridMode === 'integral') {
      return { provider: 'api_oficial', reason: 'mode_integral' };
    }

    if (config.hybridMode === 'partial') {
      if (isFirstResponse) {
        await this.markFirstResponseSent(conversationId);
        return { provider: 'api_oficial', reason: 'partial_first_response' };
      }

      const alreadySent = await this.isFirstResponseSent(conversationId);
      if (!alreadySent) {
        await this.markFirstResponseSent(conversationId);
        return { provider: 'api_oficial', reason: 'partial_first_response' };
      }

      return { provider: 'api_alternativa', reason: 'partial_subsequent' };
    }

    if (config.hybridMode === 'random') {
      const provider = await this.getOrCreateConversationState(
        conversationId,
        config.hybridRandomPercentage
      );
      return { provider, reason: `random_persisted_${provider}` };
    }

    return { provider: 'api_oficial', reason: 'fallback' };
  },

  async markFirstResponseSent(conversationId: string): Promise<void> {
    await supabase
      .from('conversation_hybrid_state')
      .update({ first_response_sent: true })
      .eq('conversation_id', conversationId);
  },

  async isFirstResponseSent(conversationId: string): Promise<boolean> {
    const { data } = await supabase
      .from('conversation_hybrid_state')
      .select('first_response_sent')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    return Boolean((data as any)?.first_response_sent);
  },

  async getOrCreateConversationState(
    conversationId: string,
    randomPercentage: number
  ): Promise<HybridProvider> {
    const { data: existing } = await supabase
      .from('conversation_hybrid_state')
      .select('provider_override')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (existing?.provider_override) {
      return existing.provider_override as HybridProvider;
    }

    const provider: HybridProvider =
      Math.random() * 100 < randomPercentage ? 'api_oficial' : 'api_alternativa';

    await supabase
      .from('conversation_hybrid_state')
      .upsert(
        {
          conversation_id: conversationId,
          provider_override: provider,
          first_response_sent: false,
        },
        { onConflict: 'conversation_id' }
      );

    return provider;
  },

  async getConversationState(conversationId: string): Promise<{
    provider?: HybridProvider;
    firstResponseSent: boolean;
  }> {
    const { data } = await supabase
      .from('conversation_hybrid_state')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (!data) {
      return { firstResponseSent: false };
    }

    return {
      provider: (data as any)?.provider_override,
      firstResponseSent: Boolean((data as any)?.first_response_sent),
    };
  },
};
