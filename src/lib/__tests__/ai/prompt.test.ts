import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../../../supabase/functions/_shared/ai/prompt';
import { currentPeriod } from '../../../../supabase/functions/_shared/ai/settings';
import type { AgentContext, AgentSettings } from '../../../../supabase/functions/_shared/ai/types';

function mockAgent(overrides: Partial<AgentSettings> = {}): AgentSettings {
  return {
    id: 'a1', tenant_id: 't1', agent_name: 'Ana', greeting_enabled: true, ask_name_enabled: false,
    typing_simulation: true, active: true, post_handoff_behavior: 'continue',
    handoff_message: 'msg', transfer_message: 'msg', uncovered_transfer: true,
    auto_os_enabled: true, auto_schedule_enabled: true, respond_in_groups: false,
    openrouter_model: 'openai/gpt-4o-mini', own_api_key: null,
    ...overrides,
  };
}

function mockCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    supabase: {},
    conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending' },
    tenantId: 't1',
    companyName: 'TechFix',
    agent: mockAgent(),
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
    timezone: 'America/Sao_Paulo',
    uazapiBase: 'https://api.uazapi.com',
    connectionToken: 'tok',
    allowedValues: new Set<number>(),
    handoffRequested: false,
    canonicalQuote: null,
    toolsUsed: [],
    toolResults: [],
    ...overrides,
  } as AgentContext;
}

describe('buildSystemPrompt (roteiro do especialista)', () => {
  it('contém nome do agente, empresa e período da saudação', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('Ana');
    expect(prompt).toContain('TechFix');
    expect(prompt).toContain('manhã');
    expect(prompt).toContain('"Bom dia!"');
  });

  it('primeiro contato exige recepção calorosa mesmo com problema na 1ª msg', () => {
    const prompt = buildSystemPrompt(mockCtx({ isFirstContact: true }));
    expect(prompt).toContain('PRIMEIRO contato');
    expect(prompt).toContain('NÃO pule a recepção');
  });

  it('cliente retornado (histórico) também recebe a saudação com nome e empresa', () => {
    const prompt = buildSystemPrompt(mockCtx({ isFirstContact: false }));
    expect(prompt).toContain('assistente de suporte da TechFix');
    expect(prompt).toContain('Ana');
    expect(prompt).toContain('novamente da TechFix');
    expect(prompt).toContain('que bom ter você de volta');
  });

  it('saudação usa a frase exata do período atual', () => {
    const prompt = buildSystemPrompt(mockCtx({ period: 'tarde' }));
    expect(prompt).toContain('"Boa tarde!"');
    const promptManha = buildSystemPrompt(mockCtx({ period: 'manhã' }));
    expect(promptManha).toContain('"Bom dia!"');
  });

  it('pergunta de nome ativa instrui o agente a perguntar e salvar via tool no primeiro contato', () => {
    const prompt = buildSystemPrompt(mockCtx({ isFirstContact: true, agent: { ...mockAgent(), ask_name_enabled: true } }));
    expect(prompt).toContain('Pergunta de nome ATIVA');
    expect(prompt).toContain('update_customer_name');
    expect(prompt).toContain('NUNCA o nome atual do sistema');
  });

  it('pergunta de nome ativa usa o nome confirmado do lead nos contatos seguintes', () => {
    const prompt = buildSystemPrompt(mockCtx({
      isFirstContact: false,
      contactName: 'Maria',
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending', customer_name_confirmed: true },
      agent: { ...mockAgent(), ask_name_enabled: true },
    }));
    expect(prompt).toContain('O nome confirmado deste cliente é "Maria"');
    expect(prompt).not.toContain('Pergunta de nome ATIVA');
  });

  it('nome nao confirmado: pergunta mesmo em retomada (nao usa o nome do whatsapp)', () => {
    const prompt = buildSystemPrompt(mockCtx({
      isFirstContact: false,
      contactName: 'Grupo LS Tecnologia',
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending', customer_name_confirmed: false },
      agent: { ...mockAgent(), ask_name_enabled: true },
    }));
    expect(prompt).toContain('AINDA NÃO foi confirmado');
    expect(prompt).not.toContain('Trate-o pelo nome');
  });

  it('injeta a cobertura de aparelhos', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('smartphone: Apple, Samsung');
  });

  it('modo somente tela proíbe orçamento de vidro (sem generalizar para outros serviços)', () => {
    const prompt = buildSystemPrompt(mockCtx({ diagnosis: { repair_mode: 'screen_only', glass_rules: null } }));
    expect(prompt).toContain('apenas com troca de tela completa');
    expect(prompt).toContain('NÃO significa que a empresa só trabalha com telas');
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

  it('conversa devolvida ha menos de 1h: follow-up com conhecimento do que foi resolvido', () => {
    const prompt = buildSystemPrompt(mockCtx({
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending', ai_released_at: new Date(Date.now() - 30 * 60_000).toISOString() },
    }));
    expect(prompt).toContain('Pós-atendimento humano');
    expect(prompt).toContain('Vi que você acabou de ser atendido');
    expect(prompt).toContain('apenas AGRADECER');
    expect(prompt).toContain('RETOMAR o mesmo assunto');
  });

  it('conversa devolvida ha mais de 1h: reinicio com saudacao de retomada', () => {
    const prompt = buildSystemPrompt(mockCtx({
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'attending', ai_released_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    }));
    expect(prompt).toContain('REINÍCIO');
    expect(prompt).toContain('que bom ter você de volta');
    expect(prompt).not.toContain('Vi que você acabou de ser atendido');
  });

  it('conversa transferida restringe o comportamento da IA', () => {
    const prompt = buildSystemPrompt(mockCtx({
      conversation: { id: 'c1', contact_phone: '5511', ai_state: 'handed_off' },
    }));
    expect(prompt).toContain('transferida para um atendente humano');
    expect(prompt).toContain('NÃO faça novos orçamentos');
  });

  it('injeta a data atual e orienta conversao de datas relativas', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('# Data e hora');
    expect(prompt).toContain('Hoje é');
    expect(prompt).toContain('Amanhã:');
    expect(prompt).toContain('Depois de amanhã');
  });

  it('exige etapas unicas por conversa (sem reenviar orcamento/templates)', () => {
    const prompt = buildSystemPrompt(mockCtx());
    expect(prompt).toContain('ETAPAS ÚNICAS');
    expect(prompt).toContain('UMA única vez por conversa');
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
