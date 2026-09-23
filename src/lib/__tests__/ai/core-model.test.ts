import { describe, it, expect } from 'vitest';
import { coreModelTerm } from '../../../../supabase/functions/_shared/ai/tools';

describe('coreModelTerm (nome popular -> termo central)', () => {
  it('remove Galaxy da busca: "Galaxy S22" -> "s22"', () => {
    expect(coreModelTerm('Galaxy S22')).toBe('s22');
  });

  it('remove iPhone: "iPhone 14 Pro Max" -> "14 pro max"', () => {
    expect(coreModelTerm('iPhone 14 Pro Max')).toBe('14 pro max');
  });

  it('nome popular puro permanece: "S22" -> "s22"', () => {
    expect(coreModelTerm('S22')).toBe('s22');
  });

  it('"14 pro max" -> "14 pro max"', () => {
    expect(coreModelTerm('14 pro max')).toBe('14 pro max');
  });

  it('remove acentos: "Moto G Power" -> "g power"', () => {
    expect(coreModelTerm('Moto G Power')).toBe('g power');
  });

  it('Redmi Note 10 -> "10"', () => {
    expect(coreModelTerm('Redmi Note 10')).toBe('10');
  });
});
