import { describe, it, expect, vi } from 'vitest';
import { executeTool } from '../../../../supabase/functions/_shared/ai/tools';
import type { AgentContext } from '../../../../supabase/functions/_shared/ai/types';

const PART = { id: 'part-1', name: 'Tela iPhone 11', price: 349.9, stock_quantity: 3, part_type: 'tela', device_brand: 'Apple', device_model: 'iPhone 11' };

function mockCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  const fromChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: PART, error: null }),
    limit: vi.fn().mockReturnThis(),
  };
  const supabase = { from: vi.fn().mockReturnValue(fromChain) };
  return {
    supabase,
    conversation: { id: 'c1', contact_phone: '5511' },
    tenantId: 't1',
    companyName: 'TechFix',
    agent: {
      id: 'a1', tenant_id: 't1', agent_name: 'Ana', greeting_enabled: true, ask_name_enabled: false, typing_simulation: true,
      active: true, post_handoff_behavior: 'continue', handoff_message: 'msg', transfer_message: 'msg',
      uncovered_transfer: true, auto_os_enabled: true, auto_schedule_enabled: true,
      openrouter_model: 'openai/gpt-4o-mini', own_api_key: null,
    },
    quote: {
      labor_enabled: true, labor_mode: 'included', labor_type: 'fixed', labor_value: 50,
      quote_template: 'Serviço: {servico}\nValor: {valor_total}',
    },
    diagnosis: { repair_mode: 'screen_only', glass_rules: null },
    coverage: [],
    templates: [],
    customer: { id: 'cust-1', name: 'João' },
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

describe('build_quote (cálculo de orçamento em código)', () => {
  it('calcula total = peça + mão de obra fixa embutida', async () => {
    const ctx = mockCtx();
    const result = await executeTool(ctx, 'build_quote', { part_id: 'part-1', service_type: 'Troca de tela' });
    expect(result.ok).toBe(true);
    expect(result.part_price).toBe(349.9);
    expect(result.labor).toBe(50);
    expect(result.total).toBe(399.9);
    expect(result.quote_text).toContain('R$ 399,90');
  });

  it('mostra peça e mão de obra separadas quando configurado', async () => {
    const ctx = mockCtx({ quote: { labor_enabled: true, labor_mode: 'separate', labor_type: 'fixed', labor_value: 50, quote_template: '{valor_total}' } });
    const result = await executeTool(ctx, 'build_quote', { part_id: 'part-1', service_type: 'Troca de tela' });
    expect(result.quote_text).toContain('R$ 349,90 da peça + R$ 50,00 de mão de obra (total R$ 399,90)');
  });

  it('calcula mão de obra percentual sobre a peça', async () => {
    const ctx = mockCtx({ quote: { labor_enabled: true, labor_mode: 'included', labor_type: 'percent', labor_value: 10, quote_template: '{valor_total}' } });
    const result = await executeTool(ctx, 'build_quote', { part_id: 'part-1', service_type: 'Troca de tela' });
    expect(result.labor).toBe(34.99);
    expect(result.total).toBe(384.89);
  });

  it('sem mão de obra, total = preço da peça', async () => {
    const ctx = mockCtx({ quote: { labor_enabled: false, labor_mode: 'included', labor_type: 'fixed', labor_value: 0, quote_template: '{valor_total}' } });
    const result = await executeTool(ctx, 'build_quote', { part_id: 'part-1', service_type: 'Troca de tela' });
    expect(result.total).toBe(349.9);
    expect(result.labor).toBe(0);
  });

  it('registra valores permitidos no validador (nunca inventar preço)', async () => {
    const ctx = mockCtx();
    await executeTool(ctx, 'build_quote', { part_id: 'part-1', service_type: 'Troca de tela' });
    expect(ctx.allowedValues.has(349.9)).toBe(true);
    expect(ctx.allowedValues.has(50)).toBe(true);
    expect(ctx.allowedValues.has(399.9)).toBe(true);
    expect(ctx.canonicalQuote).toBeTruthy();
  });

  it('substitui variáveis do template', async () => {
    const ctx = mockCtx();
    const result = await executeTool(ctx, 'build_quote', {
      part_id: 'part-1', service_type: 'Troca de tela', device_model: 'iPhone 11',
    });
    expect(result.quote_text).toContain('Troca de tela');
    expect(result.quote_text).toContain('Serviço');
  });
});

describe('handoff_to_human', () => {
  it('marca a flag de handoff', async () => {
    const ctx = mockCtx();
    const result = await executeTool(ctx, 'handoff_to_human', {});
    expect(ctx.handoffRequested).toBe(true);
    expect(result.ok).toBe(true);
  });
});
