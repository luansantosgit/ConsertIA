import { describe, it, expect } from 'vitest';
import {
  buildProductsFromSheet,
  dedupeProducts,
  applyNormalizedNames,
  canonicalPartType,
  type ImportProduct, type ParsedSheet,
} from '../ai-import-parse';
import type { NormalizedResults } from '@/lib/ai-import.service';

const sheet = (rows: unknown[][]): ParsedSheet => ({
  name: 'Aba 1',
  sampleRows: rows.slice(0, 10).map((r) => r.map((c) => String(c ?? ''))),
  allRows: rows,
});

const mapping = (nameIdx: number): Parameters<typeof buildProductsFromSheet>[1] => ({
  header_row: 0,
  columns: { name: nameIdx, sku: 1, price: 2, stock_quantity: 3 },
  formats: { price: 'brl_comma' },
  confidence: 0.95,
});

describe('ai-import-parse — linha multi-modelo vira produtos separados', () => {
  it('uma linha com vários modelos quebra em um produto por variante', () => {
    const { products } = buildProductsFromSheet(
      sheet([
        ['PRODUTO', 'SKU', 'PREÇO', 'ESTOQUE'],
        ['EDGE/ EDGE PLUS SEM ARO', '', '450,00', '3'],
      ]),
      mapping(0),
    );
    expect(products).toHaveLength(1);

    const normalized: NormalizedResults = new Map([
      ['EDGE/ EDGE PLUS SEM ARO', [
        { i: 0, name: 'Tela Motorola Edge Sem Aro', brand: 'Motorola', model: 'Edge', confidence: 0.9 },
        { i: 0, name: 'Tela Motorola Edge Plus Sem Aro', brand: 'Motorola', model: 'Edge Plus', confidence: 0.9 },
      ]],
    ]);

    const result = applyNormalizedNames(products, normalized);
    // De dois produtos INDEPENDENTES, cada um com nome/modelo próprio
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual([
      'Tela Motorola Edge Sem Aro',
      'Tela Motorola Edge Plus Sem Aro',
    ]);
    // Preço/estoque da linha copiados para as duas variantes
    expect(result.every((p) => p.price === 450)).toBe(true);
    expect(result.every((p) => p.stock_quantity === 3)).toBe(true);
    expect(result[0].device_model).toBe('Edge');
    expect(result[1].device_model).toBe('Edge Plus');
  });

  it('variante com SKU da planilha ganha sufixo para continuar única', () => {
    const { products } = buildProductsFromSheet(
      sheet([
        ['PRODUTO', 'SKU', 'PREÇO'],
        ['G52/G82 COM ARO', 'TEL-001', '99,00'],
      ]),
      mapping(0),
    );
    const normalized: NormalizedResults = new Map([
      ['G52/G82 COM ARO', [
        { i: 0, name: 'Tela Moto G52 Com Aro', brand: 'Motorola', model: 'Moto G52' },
        { i: 0, name: 'Tela Moto G82 Com Aro', brand: 'Motorola', model: 'Moto G82' },
      ]],
    ]);
    const result = applyNormalizedNames(products, normalized);
    expect(result[0].sku).toBe('TEL-001');
    expect(result[1].sku).toBe('TEL-001-2');
  });

  it('dedupe pós-split não colapsa variantes nem duplica repetidas', () => {
    const p = (name: string, sku: string): ImportProduct => ({
      name, rawName: 'x', sku, sheet: 'A',
    });
    const { unique, duplicates } = dedupeProducts([
      p('Tela Moto G52', 'T1'), p('Tela Moto G82', 'T1-2'),
      p('Tela Moto G52', 'T1'), // repetida -> deduplicada
    ]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toBe(1);
  });

  it('sem variantes: comportamento clássico, um produto', () => {
    const { products } = buildProductsFromSheet(
      sheet([['PRODUTO'], ['TELA IPHONE 11 ORI']]),
      { header_row: 0, columns: { name: 0 }, formats: {}, confidence: 0.9 },
    );
    const normalized: NormalizedResults = new Map([
      ['TELA IPHONE 11 ORI', [{ i: 0, name: 'Tela iPhone 11 Original', brand: 'Apple', model: 'iPhone 11', part_type: 'original' }]],
    ]);
    const result = applyNormalizedNames(products, normalized);
    expect(result).toHaveLength(1);
    expect(result[0].part_type).toBe('original');
  });

  it('canonicalPartType extrai a qualidade da descrição da planilha', () => {
    expect(canonicalPartType('TELA ORI IMPORTADA')).toBe('original');
    expect(canonicalPartType('TAMPA TRASEIRA PREMIUM')).toBe('premium');
    expect(canonicalPartType('GENÉRICA')).toBe('compatível');
    expect(canonicalPartType('INCELL 2K')).toBe('incell');
    expect(canonicalPartType('SEM CATEGORIA CONHECIDA')).toBe('SEM CATEGORIA CONHECIDA');
  });
});
