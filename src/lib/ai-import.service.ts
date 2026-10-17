import { supabase } from './supabase';

/**
 * Importação inteligente de estoque via IA.
 * A IA só faz o que JS não consegue: entender o layout da planilha
 * e padronizar textos. O parse numérico de milhares de linhas é
 * determinístico (custo ~zero em tokens).
 */

export interface SheetSample {
  name: string;
  rows: string[][];
}

export interface SheetMapping {
  header_row: number;
  columns: Record<string, number>;
  formats: Record<string, string>;
  confidence: number;
  notes?: string;
}

export interface NormalizedName {
  i: number;
  name: string;
  brand?: string;
  category?: string;
}

const NAME_BATCH_SIZE = 50;

async function invokeImport<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-inventory-import', { body });
  if (error) {
    const payload = { ...((data ?? {}) as Record<string, unknown>) };
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        Object.assign(payload, await ctx.json());
      } catch { /* mantém fallback */ }
    }
    const err = new Error(String(payload.error ?? 'request_failed')) as Error & { code?: string };
    err.code = String(payload.error ?? 'request_failed');
    throw err;
  }
  return data as T;
}

/** Etapa 1: IA lê as amostras das abas e devolve o mapa de colunas */
export async function mapSheetColumns(sheets: SheetSample[]): Promise<SheetMapping[]> {
  const res = await invokeImport<{ ok: boolean; sheets: SheetMapping[] }>({
    action: 'map',
    sheets: sheets.map((s) => ({
      name: s.name,
      rows: s.rows.map((r) => r.map((c) => String(c ?? ''))),
    })),
  });
  return res.sheets ?? [];
}

/**
 * Etapa 2: padroniza nomes em lotes, reportando progresso.
 * Falha em um lote não derruba os demais — os nomes crus são mantidos.
 */
export async function normalizeProductNames(
  names: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, NormalizedName>> {
  const result = new Map<string, NormalizedName>();
  const batches: string[][] = [];
  for (let i = 0; i < names.length; i += NAME_BATCH_SIZE) {
    batches.push(names.slice(i, i + NAME_BATCH_SIZE));
  }

  let done = 0;
  for (const batch of batches) {
    try {
      const res = await invokeImport<{ ok: boolean; items: NormalizedName[] }>({
        action: 'normalize',
        items: batch,
      });
      (res.items ?? []).forEach((item) => {
        const idx = Number(item.i);
        if (Number.isInteger(idx) && idx >= 0 && idx < batch.length) {
          const raw = batch[idx];
          if (item.name && raw) {
            result.set(raw, { i: idx, name: String(item.name), brand: item.brand, category: item.category });
          }
        }
      });
    } catch (err) {
      console.warn('[ai-import] lote de nomes falhou, mantendo originais:', err);
    }
    done += batch.length;
    onProgress?.(Math.min(done, names.length), names.length);
  }
  return result;
}

/**
 * Converte valor numérico da planilha em number, usando o formato
 * detectado pela IA + heurística robusta para formatos brasileiros.
 */
export function parseSheetNumber(value: unknown, format?: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let s = String(value).trim();
  if (!s) return null;

  // Remove moeda, espaços e sufixos de unidade (un, pc, pç, cx...)
  s = s
    .replace(/r\$\s*/gi, '')
    .replace(/(un\.?|pç[ça]?|peça|pc|cx|kg|g\b)/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // O último separador é o decimal: 1.234,56 ou 1,234.56
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    s = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    // Só vírgula: decimal no padrão BR (formato brl_comma/plain_comma),
    // a menos que sejam 3 dígitos exatos = milhar (ex: "1,500")
    const parts = s.split(',');
    const isThousands = parts.length === 2 && parts[1].length === 3 && format !== 'plain_comma' && format !== 'brl_comma';
    s = isThousands ? s.replace(',', '') : s.replace(',', '.');
  }
  // Só ponto ou nenhum separador: valor direto

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
