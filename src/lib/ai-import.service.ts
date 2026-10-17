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
  model?: string;
  part_type?: string;
  category?: string;
  unclear?: string[];
  confidence?: number;
}

/** Um nome cru pode gerar N variantes (linha com vários modelos: "NOTE 10/POCO M5S") */
export type NormalizedResults = Map<string, NormalizedName[]>;


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

// 50 itens/lote mantém a resposta (~3k tokens) longe do limite do modelo —
// lote grande trunca o JSON e o lote inteiro é perdido
const NAME_BATCH_SIZE = 50;
// 8 lotes simultâneos: 3.000 nomes = 60 lotes = ~8 rodadas (~2 min),
// em vez de ~20 rodadas com 3 workers. Backoff cuida de rate-limit (429).
const PARALLEL_WORKERS = 8;
const RETRY_DELAYS = [1500, 4000];

const sleep = (ms: number) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Etapa 2: padroniza nomes em lotes PARALELOS (3 simultâneos de 100),
 * reportando progresso. Falha em um lote não derruba os demais —
 * os nomes crus são mantidos.
 */
export async function normalizeProductNames(
  names: string[],
  onProgress?: (done: number, total: number) => void,
  clarification?: { term: string; meaning: string },
): Promise<NormalizedResults> {
  const result = new Map<string, NormalizedName[]>();
  const batches: string[][] = [];
  for (let i = 0; i < names.length; i += NAME_BATCH_SIZE) {
    batches.push(names.slice(i, i + NAME_BATCH_SIZE));
  }

  let done = 0;
  let nextBatch = 0;

  const applyBatch = (batch: string[], items: NormalizedName[] | undefined) => {
    (items ?? []).forEach((item) => {
      const idx = Number(item.i);
      if (Number.isInteger(idx) && idx >= 0 && idx < batch.length) {
        const raw = batch[idx];
        if (item.name && raw) {
          const entry: NormalizedName = { i: idx, name: String(item.name), brand: item.brand, model: item.model, part_type: item.part_type, category: item.category, unclear: item.unclear, confidence: item.confidence };
          // Múltiplas variantes do mesmo raw (linha com vários modelos): acumula
          const existing = result.get(raw);
          if (existing) existing.push(entry);
          else result.set(raw, [entry]);
        }
      }
    });
  };

  const runBatch = async (batch: string[], clarification?: { term: string; meaning: string }) => {
    const res = await invokeImport<{ ok: boolean; items: NormalizedName[] }>({
      action: clarification ? 'clarify' : 'normalize',
      items: batch,
      ...(clarification && { term: clarification.term, meaning: clarification.meaning }),
    });
    applyBatch(batch, res.items);
  };

  const worker = async (clarification?: { term: string; meaning: string }) => {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      // Backoff progressivo: rate-limit (429) ou falha transitória não
      // perde o lote — tenta até 3x com pausa crescente
      let ok = false;
      for (let attempt = 0; attempt <= RETRY_DELAYS.length && !ok; attempt++) {
        try {
          await runBatch(batch, clarification);
          ok = true;
        } catch (err) {
          console.warn(`[ai-import] lote falhou (tentativa ${attempt + 1}/${RETRY_DELAYS.length + 1}):`, err);
          if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
        }
      }
      if (!ok) console.warn('[ai-import] lote falhou definitivamente, mantendo nomes originais');
      done += batch.length;
      onProgress?.(Math.min(done, names.length), names.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PARALLEL_WORKERS, batches.length) }, () => worker(clarification)),
  );
  return result;
}

/**
 * Etapa de dúvidas: re-normaliza os nomes com o esclarecimento da empresa
 * sobre um termo ("11 ORI" = "tela do iPhone 11 original"). A resposta
 * fica salva no glossário do tenant (a edge grava) — a próxima importação
 * já aplica sem perguntar de novo.
 */
export async function clarifyProductNames(
  names: string[],
  term: string,
  meaning: string,
  onProgress?: (done: number, total: number) => void,
): Promise<NormalizedResults> {
  return normalizeProductNames(names, onProgress, { term, meaning: meaning });
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
