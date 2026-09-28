import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyLoss,
  formatBRL,
  digits,
  validateLead,
  escapeHtml,
  normalizePlans,
  DEFAULT_SUPPORT_WA,
} from '../../../public/site/site.js';

describe('calculateMonthlyLoss (calculadora do site)', () => {
  it('calcula o exemplo padrão do site (20 orçamentos/dia × R$ 250)', () => {
    const { monthlyLoss, lostQuotes } = calculateMonthlyLoss(20, 250);
    expect(monthlyLoss).toBe(37500);
    expect(lostQuotes).toBe(150);
  });

  it('retorna zero para entradas zeradas', () => {
    expect(calculateMonthlyLoss(0, 250).monthlyLoss).toBe(0);
    expect(calculateMonthlyLoss(20, 0).monthlyLoss).toBe(0);
  });

  it('arredonda ticket para inteiro e ignora valores negativos', () => {
    expect(calculateMonthlyLoss(-5, 250).monthlyLoss).toBe(0);
    expect(calculateMonthlyLoss(3, 99.7).monthlyLoss).toBe(2250);
  });
});

describe('formatBRL', () => {
  it('formata valores no padrão brasileiro (com espaço não-quebrável)', () => {
    expect(formatBRL(37500)).toBe('R$\u00A037.500');
    expect(formatBRL(69.9)).toBe('R$\u00A070');
  });

  it('formata preço de plano com centavos', () => {
    expect(formatBRL(69.9, 2)).toBe('R$\u00A069,90');
    expect(formatBRL(250, 2)).toBe('R$\u00A0250,00');
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres perigosos (defesa XSS)', () => {
    expect(escapeHtml('<img "x"> & DeeperIA')).toBe('&#60;img &#34;x&#34;&#62; &#38; DeeperIA');
    expect(escapeHtml("d'Agua")).toBe('d&#39;Agua');
  });
});

describe('normalizePlans (planos vindos do superadmin)', () => {
  it('normaliza planos válidos e limpa features vazias', () => {
    const plans = normalizePlans([
      { name: ' Profissional ', price: '69.9', features: ['IA liberada', '   ', ''], show_on_site: true, featured: false },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Profissional');
    expect(plans[0].price).toBe(69.9);
    expect(plans[0].features).toEqual(['IA liberada']);
    expect(plans[0].showOnSite).toBe(true);
    expect(plans[0].featured).toBe(false);
  });

  it('descarta entradas inválidas e entrada não-array', () => {
    expect(normalizePlans(null)).toEqual([]);
    expect(normalizePlans([{ bad: 1 }, { name: 'X' }, { name: 'Ok' }])).toEqual([
      expect.objectContaining({ name: 'Ok' }),
    ]);
  });

  it('preço inválido vira zero e plano nunca marcado fica sem preço', () => {
    const [plan] = normalizePlans([{ name: 'Sem preco', price: 'abc', show_on_site: false }]);
    expect(plan.price).toBe(0);
    expect(plan.showOnSite).toBe(false);
  });
});

describe('digits', () => {
  it('extrai apenas números de uma string', () => {
    expect(digits('(18) 99741-1233')).toBe('18997411233');
    expect(digits('')).toBe('');
    expect(digits(undefined)).toBe('');
  });
});

describe('validateLead (formulário do site)', () => {
  it('aceita lead válido e normaliza os dados', () => {
    const result = validateLead({
      name: '  João Silva ',
      whatsapp: '(18) 99741-1233',
      store_name: ' Tech Cell ',
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'João Silva', whatsapp: '18997411233', store_name: 'Tech Cell' });
  });

  it('rejeita nome curto', () => {
    const result = validateLead({ name: 'J', whatsapp: '18997411233', store_name: 'Loja' });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('rejeita whatsapp sem DDD', () => {
    const result = validateLead({ name: 'João', whatsapp: '99741', store_name: 'Loja' });
    expect(result.ok).toBe(false);
    expect(result.errors.whatsapp).toBeDefined();
  });

  it('rejeita loja vazia', () => {
    const result = validateLead({ name: 'João', whatsapp: '18997411233', store_name: '' });
    expect(result.ok).toBe(false);
    expect(result.errors.store_name).toBeDefined();
  });

  it('expõe fallback de whatsapp comercial configurado', () => {
    expect(DEFAULT_SUPPORT_WA).toBe('5518997411233');
  });
});
