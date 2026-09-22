import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../../../supabase/functions/_shared/ai/prompt';
import { currentPeriod } from '../../../../supabase/functions/_shared/ai/settings';
import type { AgentContext } from '../../../../supabase/functions/_shared/ai/types';

function mockCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    supabase: {},
    conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending' },
    tenantId: 't1',
    companyName: 'TechFix',
    agent: {
      id: 'a1', tenant_id: 't1', agent_name: 'Ana', greeting_enabled: true, typing_simulation: true,
      active: true, post_handoff_behavior: 'continue', handoff_message: 'msg', transfer_message: 'msg',
      uncovered_transfer: true, auto_os_enabled: true, auto_schedule_enabled: true,
      openrouter_model: 'openai/gpt-4o-mini', own_api_key: null,
    },
    quote: { labor_enabled: false, labor_mode: 'included', labor_type: 'fixed', labor_value: 0, quote_template: '' },
    diagnosis: { repair_mode: 'screen_only', glass_rules: null },
    coverage: [{ device_type: 'smartphone', brands: ['Apple', 'Samsung'], active: true }],
    templates: [],
    customer: null,
    contactName: 'João',
    openOrders: [],
    appointments: [],
    isFirstContact: true,
    apiKey: 'key',
    tokenLimit: 0,
    period: 'manhã',
    uazapiBase: 'https://api.uazapi.com',
    connectionToken: 'tok',
    allowedValues: new Set<number>(),
    handoffRequested: false,
    canonicalQuote: null,
    toolsUsed: [],
    ...overrides,
  } as AgentContext;
}

describe('buildSystemPrompt (roteiro do especialista)', () => {
  it('contém nome do agente, empresa e período da saudação', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('Ana');
    expect(prompt).toContain('TechFix');
    expect(prompt).toContain('Bom dia');
  });

  it('primeiro contato exige recepção calorosa mesmo com problema na 1ª msg', () => {
    const prompt = buildSystemPrompt(mockCtx({ isFirstContact: true }));
    expect(prompt).toContain('PRIMEIRA mensagem');
    expect(prompt).toContain('NÃO pule a recepção');
  });

  it('injeta a cobertura de aparelhos', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('smartphone: Apple, Samsung');
  });

  it('modo somente tela proíbe orçamento de vidro', () => {
    const prompt = buildSystemPrompt(mockCtx({ diagnosis: { repair_mode: 'screen_only', glass_rules: null } }));
    expect(prompt).toContain('APENAS com troca de tela');
  });

  it('modo vidro injeta as regras de qualificação', () => {
    const prompt = buildSystemPrompt(mockCtx({
      diagnosis: { repair_mode: 'screen_and_glass', glass_rules: 'toque funcionando, imagem perfeita' },
    }));
    expect(prompt).toContain('TROCA DE VIDRO');
    expect(prompt).toContain('toque funcionando, imagem perfeita');
  });

  it('injeta OS aberta no contexto (consciência de atendimento)', () => {
    const prompt = buildSystemPrompt(mockCtx({
      openOrders: [{ id: '12345678-abcd', subject: 'Troca de tela', status: 'in_progress', budget_amount: 400, created_at: '2026-09-01' }],
    }));
    expect(prompt).toContain('OS abertas deste cliente');
    expect(prompt).toContain('Troca de tela');
  });

  it('conversa transferida restringe o comportamento da IA', () => {
    const prompt = buildSystemPrompt(mockCtx({
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'handed_off' },
    }));
    expect(prompt).toContain('transferida para um atendente humano');
    expect(prompt).toContain('NÃO faça novos orçamentos');
  });

  it('exige divisão de mensagens com separador humano', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('---');
    expect(prompt).toContain('DIVIDA a resposta');
  });
});

describe('currentPeriod', () => {
  it('retorna manhã, tarde ou noite', () => {
    const period = currentPeriod('America/Sao_Paulo');
    expect(['manhã', 'tarde', 'noite']).toContain(period);
  });
});
