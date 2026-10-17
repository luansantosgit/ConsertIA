import * as XLSX from 'xlsx';
import { parseSheetNumber, type SheetMapping, type NormalizedResults } from '@/lib/ai-import.service';

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
 * Coluna de tipo/qualidade da planilha costuma vir como descrição completa
 * ("TELA ORI IMPORTADA", "TAMPA TRASEIRA PREMIUM"). Extrai o valor canônico
 * de qualidade usado pelo formulário; texto sem palavra-chave fica como veio.
 */
export function canonicalPartType(v: string): string {
  const s = v.trim().toUpperCase();
  if (!s) return v;
  if (s.includes('PREMIUM')) return 'premium';
  // \b = fronteira de palavra: "ORI" isolado, nunca dentro de "CATEGORIA"
  if (/\bORI\b|ORIGINAL/.test(s)) return 'original';
  if (/INCELL|\bINC\b/.test(s)) return 'incell';
  if (/REBUILD|REFURB|LACRADORA/.test(s)) return 'recondicionada';
  if (/COMPAT|\bGEN\b|GEN[ÉE]RIC|\bCOPY\b|C[ÓO]PIA/.test(s)) return 'compatível';
  return v.trim();
}

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
      if (v) p[f] = f === 'part_type' ? canonicalPartType(v) : v;
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

/**
 * Aplica os nomes padronizados pela IA. Um nome cru com VÁRIAS variantes
 * (linha com múltiplos modelos: "NOTE 10/POCO M5S") é DIVIDIDO em um
 * produto por modelo — preço/estoque/etc. são copiados para todos.
 * Retorna a lista completa (originais + quebras).
 */
export function applyNormalizedNames(
  products: ImportProduct[],
  normalized: NormalizedResults,
): ImportProduct[] {
  const out: ImportProduct[] = [];
  for (const p of products) {
    const variants = normalized.get(p.rawName);
    if (!variants || variants.length === 0) {
      out.push(p);
      continue;
    }
    variants.forEach((n, vi) => {
      const item: ImportProduct = vi === 0 ? p : { ...p };
      if (n.name) item.name = n.name;
      if (n.brand) item.device_brand = n.brand;
      if (n.model) item.device_model = n.model;
      if (n.part_type) item.part_type = n.part_type;
      if (!item.category && n.category) item.category = n.category;
      // Quebras de uma linha com SKU: sufixo mantém cada variante única
      if (vi > 0 && item.sku) item.sku = `${item.sku}-${vi + 1}`;
      out.push(item);
    });
  }
  return out;
}
