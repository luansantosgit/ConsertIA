/**
 * Hybrid Router — Roteamento centralizado API Oficial + API Alternativa
 *
 * Responsabilidade: dado o modo hibrido configurado e o estado da conversa,
 * decidir se a mensagem deve ser enviada via API Oficial ou API Alternativa.
 *
 * Regras:
 * 1. Templates SEMPRE via API Oficial (janela 24h nao se aplica)
 * 2. Janela 24h fechada -> bloqueado (quem chama deve tratar)
 * 3. Modo integral -> sempre API Oficial
 * 4. Modo partial -> 1a resposta do atendente = API Oficial, resto = API Alternativa
 * 5. Modo random -> decisao por conversa (persistida), nao por mensagem
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type HybridMode = "integral" | "partial" | "random";
export type ProviderType = "api_oficial" | "api_alternativa";
export type MessageType = "template" | "text" | "media" | "location" | "contact" | "reaction" | "menu";

export interface HybridRouteParams {
  connectionProvider: ProviderType;
  conversationId: string;
  messageType: MessageType;
  isFirstResponse?: boolean;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export interface HybridRouteResult {
  provider: ProviderType;
  reason: string;
}

/**
 * Busca a configuracao hibrida global de platform_settings
 */
export async function getHybridConfig(supabaseUrl: string, supabaseServiceKey: string): Promise<{
  hybridMode: HybridMode;
  hybridRandomPercentage: number;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from("platform_settings")
    .select("hybrid_mode, hybrid_random_percentage")
    .limit(1)
    .maybeSingle();

  return {
    hybridMode: (data as any)?.hybrid_mode || "integral",
    hybridRandomPercentage: Number((data as any)?.hybrid_random_percentage) || 100,
  };
}

/**
 * Busca ou cria o estado hibrido de uma conversa (para modo random)
 * Retorna o provider_override persistido ou cria um novo se nao existir
 */
export async function getOrCreateConversationHybridState(
  supabaseUrl: string,
  supabaseServiceKey: string,
  conversationId: string,
  randomPercentage: number,
): Promise<ProviderType> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: existing } = await supabase
    .from("conversation_hybrid_state")
    .select("provider_override")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (existing?.provider_override) {
    return existing.provider_override as ProviderType;
  }

  // Decisao randomica: percentage define quantos % vao via API Oficial
  const provider: ProviderType = Math.random() * 100 < randomPercentage ? "api_oficial" : "api_alternativa";

  await supabase.from("conversation_hybrid_state").upsert(
    {
      conversation_id: conversationId,
      provider_override: provider,
      first_response_sent: false,
    },
    { onConflict: "conversation_id" },
  );

  return provider;
}

/**
 * Marca que a 1a resposta do atendente ja foi enviada nesta conversa
 */
export async function markFirstResponseSent(
  supabaseUrl: string,
  supabaseServiceKey: string,
  conversationId: string,
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  await supabase
    .from("conversation_hybrid_state")
    .update({ first_response_sent: true })
    .eq("conversation_id", conversationId);
}

/**
 * Verifica se a 1a resposta ja foi enviada nesta conversa
 */
export async function isFirstResponseAlreadySent(
  supabaseUrl: string,
  supabaseServiceKey: string,
  conversationId: string,
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from("conversation_hybrid_state")
    .select("first_response_sent")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return Boolean((data as any)?.first_response_sent);
}

/**
 * Resolve qual provider usar para uma mensagem
 *
 * IMPORTANTE: Esta funcao NAO valida janela de 24h.
 * Quem chama DEVE validar a janela ANTES de chamar esta funcao.
 * Templates sempre via API Oficial (janela nao se aplica a templates).
 */
export async function resolveHybridRoute(params: HybridRouteParams): Promise<HybridRouteResult> {
  const { connectionProvider, conversationId, messageType, isFirstResponse } = params;

  // 1. Se a conexao NAO e hibrida (e api_alternativa puro), manter api_alternativa
  if (connectionProvider === "api_alternativa") {
    return { provider: "api_alternativa", reason: "connection_is_api_alternativa" };
  }

  // 2. Buscar config hibrida global
  const config = await getHybridConfig(params.supabaseUrl, params.supabaseServiceKey);

  // 3. Modo integral -> sempre API Oficial
  if (config.hybridMode === "integral") {
    return { provider: "api_oficial", reason: "mode_integral" };
  }

  // 4. Templates SEMPRE via API Oficial (qualquer modo)
  if (messageType === "template") {
    return { provider: "api_oficial", reason: "template_always_api_oficial" };
  }

  // 5. Modo partial
  if (config.hybridMode === "partial") {
    if (isFirstResponse) {
      // 1a resposta do atendente -> API Oficial + marcar como enviada
      await markFirstResponseSent(params.supabaseUrl, params.supabaseServiceKey, conversationId);
      return { provider: "api_oficial", reason: "partial_first_response" };
    }

    // Verificar se a 1a resposta ja foi enviada anteriormente
    const alreadySent = await isFirstResponseAlreadySent(
      params.supabaseUrl,
      params.supabaseServiceKey,
      conversationId,
    );

    if (!alreadySent) {
      // Ainda nao houve 1a resposta -> esta e a primeira -> API Oficial
      await markFirstResponseSent(params.supabaseUrl, params.supabaseServiceKey, conversationId);
      return { provider: "api_oficial", reason: "partial_first_response" };
    }

    // Ja houve 1a resposta -> resto vai via API Alternativa
    return { provider: "api_alternativa", reason: "partial_subsequent" };
  }

  // 6. Modo random -> decisao persistida por conversa
  if (config.hybridMode === "random") {
    const provider = await getOrCreateConversationHybridState(
      params.supabaseUrl,
      params.supabaseServiceKey,
      conversationId,
      config.hybridRandomPercentage,
    );
    return { provider, reason: `random_persisted_${provider}` };
  }

  // Fallback: API Oficial (seguro)
  return { provider: "api_oficial", reason: "fallback" };
}

/**
 * Versao sincrona para uso no frontend (quando a config ja esta carregada).
 * Nao busca no banco -- assume que o caller ja tem os dados.
 */
export function resolveHybridRouteSync(params: {
  connectionProvider: ProviderType;
  hybridMode: HybridMode;
  hybridRandomPercentage: number;
  isFirstResponse: boolean;
  firstResponseAlreadySent: boolean;
  conversationId: string;
  randomProviderOverride?: ProviderType | null;
}): HybridRouteResult {
  const { connectionProvider, hybridMode, isFirstResponse, firstResponseAlreadySent, randomProviderOverride } = params;

  if (connectionProvider === "api_alternativa") {
    return { provider: "api_alternativa", reason: "connection_is_api_alternativa" };
  }

  if (hybridMode === "integral") {
    return { provider: "api_oficial", reason: "mode_integral" };
  }

  if (hybridMode === "partial") {
    if (isFirstResponse && !firstResponseAlreadySent) {
      return { provider: "api_oficial", reason: "partial_first_response" };
    }
    if (!firstResponseAlreadySent) {
      return { provider: "api_oficial", reason: "partial_first_response" };
    }
    return { provider: "api_alternativa", reason: "partial_subsequent" };
  }

  if (hybridMode === "random") {
    return { provider: randomProviderOverride || "api_oficial", reason: `random_persisted_${randomProviderOverride || "api_oficial"}` };
  }

  return { provider: "api_oficial", reason: "fallback" };
}
