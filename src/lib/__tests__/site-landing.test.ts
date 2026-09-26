import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyLoss,
  formatBRL,
  digits,
  validateLead,
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
