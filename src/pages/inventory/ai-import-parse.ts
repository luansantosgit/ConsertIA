import * as XLSX from 'xlsx';
import { parseSheetNumber, type SheetMapping } from '@/lib/ai-import.service';

/** Produto padronizado pronto para o catálogo (vindo da importação com IA) */
export interface ImportProduct {
  name: string;
  rawName: string;
  sku: string;
  price?: number;
  cost?: number;
  stock_quantity?: number;
  min_stock_quantity?: number;
  category?: string;
  location?: string;
  part_type?: string;
  device_brand?: string;
  device_model?: string;
  sheet: string;
}

export interface ParsedSheet {
  name: string;
  sampleRows: string[][];
  allRows: unknown[][];
}

export interface SheetReport {
  name: string;
  productCount: number;
  mapping: SheetMapping;
}

const NUMERIC_FIELDS = ['price', 'cost', 'stock_quantity', 'min_stock_quantity'] as const;
const TEXT_FIELDS = ['sku', 'category', 'location', 'part_type', 'device_brand', 'device_model'] as const;

/** Lê TODAS as abas do arquivo (uma planilha pode ter várias páginas) */
export function readAllSheets(buffer: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  return wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      defval: '',
      raw: false,
    });
    return {
      name,
      sampleRows: rows.slice(0, 10).map((r) => (Array.isArray(r) ? r : []).map((c) => String(c ?? ''))),
      allRows: rows,
    };
  });
}

const cell = (row: unknown[], idx: number | undefined): string => {
  if (idx === undefined || idx < 0) return '';
  const v = row[idx];
  return v === null || v === undefined ? '' : String(v).trim();
};

/**
 * Aplica o mapa da IA numa aba: localiza a linha de cabeçalho, extrai
 * os dados e converte cada linha em produto padronizado (JS puro — zero custo).
 */
export function buildProductsFromSheet(
  sheet: ParsedSheet,
  mapping: SheetMapping,
): { products: ImportProduct[]; issues: string[] } {
  const issues: string[] = [];
  const nameIdx = mapping.columns?.name;
  if (!Number.isInteger(nameIdx) || (nameIdx ?? -1) < 0) {
    return { products: [], issues: [`Aba "${sheet.name}": coluna de nome não encontrada`] };
  }

  const headerRow = Math.max(0, Number(mapping.header_row) || 0);
  const dataRows = sheet.allRows.slice(headerRow + 1);
  const products: ImportProduct[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const arr = Array.isArray(row) ? row : [];
    const rawName = cell(arr, Number(nameIdx));
    if (!rawName) {
      if (arr.some((v) => String(v ?? '').trim() !== '')) skipped++;
      continue;
    }
    const p: ImportProduct = {
      rawName,
      name: rawName,
      sku: cell(arr, mapping.columns?.sku),
      sheet: sheet.name,
    };
    for (const f of NUMERIC_FIELDS) {
      const idx = mapping.columns?.[f];
      const v = parseSheetNumber(cell(arr, idx), mapping.formats?.[f]);
      if (v !== null) p[f] = v;
    }
    for (const f of TEXT_FIELDS) {
      const v = cell(arr, mapping.columns?.[f]);
      if (v) p[f] = v;
    }
    products.push(p);
  }

  if (skipped > 0) issues.push(`Aba "${sheet.name}": ${skipped} linha(s) sem nome ignorada(s)`);
  return { products, issues };
}

/**
 * Deduplica produtos: por SKU (se houver) ou por nome (case-insensitive).
 * Primeira ocorrência vence; duplicatas viram aviso.
 */
export function dedupeProducts(products: ImportProduct[]): {
  unique: ImportProduct[];
  duplicates: number;
} {
  const seenSku = new Set<string>();
  const seenName = new Set<string>();
  const unique: ImportProduct[] = [];
  let duplicates = 0;

  for (const p of products) {
    const skuKey = p.sku ? p.sku.toLowerCase() : '';
    const nameKey = p.name.trim().toLowerCase();
    if ((skuKey && seenSku.has(skuKey)) || (!skuKey && seenName.has(nameKey))) {
      duplicates++;
      continue;
    }
    if (skuKey) seenSku.add(skuKey);
    seenName.add(nameKey);
    unique.push(p);
  }
  return { unique, duplicates };
}

/** Aplica os nomes padronizados pela IA (nome, marca, modelo, tipo e categoria se vazio) */
export function applyNormalizedNames(
  products: ImportProduct[],
  normalized: Map<string, { name: string; brand?: string; model?: string; part_type?: string; category?: string }>,
): void {
  for (const p of products) {
    const n = normalized.get(p.rawName);
    if (!n) continue;
    p.name = n.name || p.name;
    if (!p.device_brand && n.brand) p.device_brand = n.brand;
    if (!p.device_model && n.model) p.device_model = n.model;
    if (!p.part_type && n.part_type) p.part_type = n.part_type;
    if (!p.category && n.category) p.category = n.category;
  }
}
