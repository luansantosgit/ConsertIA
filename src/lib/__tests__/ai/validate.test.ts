import { describe, it, expect } from 'vitest';
import { normalizeMoneyString, extractMoneyValues, hasInvalidMoney, splitMessageParts } from '../../../../supabase/functions/_shared/ai/validate';

describe('normalizeMoneyString', () => {
  it('converte formato pt-BR com separador de milhar', () => {
    expect(normalizeMoneyString('1.234,56')).toBe(1234.56);
  });

  it('converte formato simples com virgula', () => {
    expect(normalizeMoneyString('349,90')).toBe(349.9);
  });

  it('converte formato com ponto decimal', () => {
    expect(normalizeMoneyString('349.90')).toBe(349.9);
  });

  it('converte valor inteiro', () => {
    expect(normalizeMoneyString('500')).toBe(500);
  });
});

describe('extractMoneyValues', () => {
  it('extrai valores com R$', () => {
    expect(extractMoneyValues('O valor é R$ 349,90 total')).toEqual([349.9]);
  });

  it('extrai multiplos valores', () => {
    const values = extractMoneyValues('R$ 100,00 da peça e R$ 50 de mão de obra');
    expect(values).toContain(100);
    expect(values).toContain(50);
  });

  it('extrai valores seguidos de "reais"', () => {
    expect(extractMoneyValues(' custa 120 reais ')).toContain(120);
  });

  it('ignora numeros que nao sao valores monetarios', () => {
    expect(extractMoneyValues('Seu pedido 1234 chega dia 25')).toEqual([]);
  });
});

describe('hasInvalidMoney (blindagem anti-preco-inventado)', () => {
  const allowed = new Set([349.9, 50, 399.9]);

  it('aceita valores vindos das tools', () => {
    expect(hasInvalidMoney('Ficaria R$ 349,90 com mão de obra de R$ 50', allowed)).toBe(false);
  });

  it('bloqueia preco inventado', () => {
    expect(hasInvalidMoney('Sai por R$ 199,99', allowed)).toBe(true);
  });

  it('sem valores na mensagem nunca bloqueia', () => {
    expect(hasInvalidMoney('Posso agendar pra quinta?', allowed)).toBe(false);
  });

  it('sem valores permitidos nao bloqueia (contexto sem tools de preco)', () => {
    expect(hasInvalidMoney('O total é R$ 75,00', new Set())).toBe(false);
  });
});

describe('splitMessageParts (mensagens humanizadas)', () => {
  it('divide pelo separador ---', () => {
    const parts = splitMessageParts('Bom dia! 😊---Sou a Ana, da TechFix---Me conta o que houve?');
    expect(parts).toEqual(['Bom dia! 😊', 'Sou a Ana, da TechFix', 'Me conta o que houve?']);
  });

  it('remove partes vazias', () => {
    const parts = splitMessageParts('Oi!---   ---Tudo bem?');
    expect(parts).toEqual(['Oi!', 'Tudo bem?']);
  });

  it('texto sem separador vira uma unica parte', () => {
    expect(splitMessageParts('Só uma mensagem')).toEqual(['Só uma mensagem']);
  });

  it('divide por paragrafos quando nao ha separador ---', () => {
    const parts = splitMessageParts('Bom dia! 😊\n\nEu sou a Ana, da TechFix\n\nComo posso te ajudar?');
    expect(parts).toEqual(['Bom dia! 😊', 'Eu sou a Ana, da TechFix', 'Como posso te ajudar?']);
  });

  it('paragrafo unico com quebras simples permanece uma bolha', () => {
    expect(splitMessageParts('Serviço: troca de tela\nValor: R$ 400,00')).toEqual(['Serviço: troca de tela\nValor: R$ 400,00']);
  });

  it('limita a 6 partes', () => {
    const text = Array.from({ length: 10 }, (_, i) => `parte${i}`).join('---');
    expect(splitMessageParts(text)).toHaveLength(6);
  });
});
