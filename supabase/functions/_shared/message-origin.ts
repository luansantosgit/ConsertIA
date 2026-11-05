/**
 * Classifica a ORIGEM de uma mensagem recebida da Uazapi (issue #105).
 *
 * A Uazapi entrega no webhook `messages` tanto as mensagens RECEBIDAS
 * quanto as ENVIADAS pela instancia. O campo `message.wasSentByApi`
 * discriminina a origem:
 *
 *   • `fromMe: false`                        → mensagem do LEAD (inbound)
 *   • `fromMe: true, wasSentByApi: true`     → enviada pela API — o sistema
 *                                              JÁ gravou a mensagem, então o
 *                                              webhook deve ignorar (dedupe)
 *   • `fromMe: true` (sem `wasSentByApi`)    → enviada PELO APARELHO do
 *                                              atendente ("echo") — precisa
 *                                              entrar no chat do sistema
 *
 * O histórico importado (evento `history`) sempre entra, inclusive as
 * mensagens do atendente.
 */
export interface MessageOriginInput {
  fromMe?: boolean;
  wasSentByApi?: boolean;
  isHistoryEvent?: boolean;
}

export interface MessageOrigin {
  /** Mensagem enviada pelo próprio numero da instancia */
  isFromMe: boolean;
  /** Mensagem enviada pela API (o sistema ja gravou) */
  wasSentByApi: boolean;
  /** Echo: mensagem respondida pelo celular do atendente */
  isDeviceEcho: boolean;
  /** O webhook deve descartar a mensagem (ja gravada pelo sistema) */
  shouldSkip: boolean;
}

export function classifyMessageOrigin(input: MessageOriginInput): MessageOrigin {
  const isFromMe = input.fromMe === true;
  const wasSentByApi = input.wasSentByApi === true;
  const isHistoryEvent = input.isHistoryEvent === true;

  return {
    isFromMe,
    wasSentByApi,
    isDeviceEcho: isFromMe && !wasSentByApi && !isHistoryEvent,
    shouldSkip: isFromMe && wasSentByApi && !isHistoryEvent,
  };
}
