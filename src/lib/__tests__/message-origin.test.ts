// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { classifyMessageOrigin } from '../../../supabase/functions/_shared/message-origin.ts';

/**
 * Issue #105 — a Uazapi usa `wasSentByApi` para dizer a ORIGEM da mensagem.
 * Sem essa distinção, a resposta do atendente pelo celular nunca chegava ao
 * chat do sistema (o webhook ignorava todo `fromMe: true`).
 */
describe('classifyMessageOrigin (echo — issue #105)', () => {
  it('mensagem recebida do lead não é fromMe e não é eco', () => {
    const origin = classifyMessageOrigin({ fromMe: false });
    expect(origin.isFromMe).toBe(false);
    expect(origin.isDeviceEcho).toBe(false);
    expect(origin.shouldSkip).toBe(false);
  });

  it('mensagem enviada pela API é descartada (o sistema já gravou)', () => {
    const origin = classifyMessageOrigin({ fromMe: true, wasSentByApi: true });
    expect(origin.isFromMe).toBe(true);
    expect(origin.wasSentByApi).toBe(true);
    expect(origin.isDeviceEcho).toBe(false);
    expect(origin.shouldSkip).toBe(true);
  });

  it('mensagem enviada pelo aparelho é o eco (entra no chat)', () => {
    const origin = classifyMessageOrigin({ fromMe: true });
    expect(origin.isFromMe).toBe(true);
    expect(origin.wasSentByApi).toBe(false);
    expect(origin.isDeviceEcho).toBe(true);
    expect(origin.shouldSkip).toBe(false);
  });

  it('wasSentByApi = false explícito também é eco', () => {
    const origin = classifyMessageOrigin({ fromMe: true, wasSentByApi: false });
    expect(origin.isDeviceEcho).toBe(true);
    expect(origin.shouldSkip).toBe(false);
  });

  it('histórico importa inclusive as mensagens do atendente', () => {
    const fromApi = classifyMessageOrigin({
      fromMe: true,
      wasSentByApi: true,
      isHistoryEvent: true,
    });
    expect(fromApi.shouldSkip).toBe(false);
    expect(fromApi.isDeviceEcho).toBe(false);

    const fromDevice = classifyMessageOrigin({
      fromMe: true,
      isHistoryEvent: true,
    });
    expect(fromDevice.shouldSkip).toBe(false);
    // No histórico não é "echo" — é apenas importacao
    expect(fromDevice.isDeviceEcho).toBe(false);
  });

  it('mensagem sem fromMe continua sendo inbound', () => {
    const origin = classifyMessageOrigin({});
    expect(origin.isFromMe).toBe(false);
    expect(origin.isDeviceEcho).toBe(false);
    expect(origin.shouldSkip).toBe(false);
  });
});
