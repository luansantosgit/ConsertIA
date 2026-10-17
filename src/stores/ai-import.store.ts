import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductRepository } from '@/repositories/product.repository';
import { mapSheetColumns, normalizeProductNames, type SheetMapping } from '@/lib/ai-import.service';
import {
  readAllSheets, buildProductsFromSheet, dedupeProducts, applyNormalizedNames,
  type ImportProduct, type SheetReport,
} from '@/pages/inventory/ai-import-parse';
import type { StockItemForm } from '@/pages/inventory/ProductFormModal';

/**
 * Sessão global de importação com IA: o processo vive no store,
 * não no modal — o usuário pode minimizar, navegar pelo sistema e
 * voltar sem perder nada. O balão flutuante (AiImportBalloon) acompanha
 * e pulsa quando há algo para conferir.
 *
 * A sessão é PERSISTIDA (localStorage): sobrevive a reload/F5.
 * - 'importing' → retoma o envio automaticamente (upsert é idempotente)
 * - 'analyzing' → avisa que a análise foi interrompida pelo reload
 */

export type ImportStage = 'idle' | 'analyzing' | 'report' | 'importing' | 'done';

interface AnalyzeStep {
  label: string;
  progress: number;
}

interface AiImportState {
  stage: ImportStage;
  modalOpen: boolean;
  minimized: boolean;
  analyzeStep: AnalyzeStep;
  products: ImportProduct[];
  sheetReports: SheetReport[];
  issues: string[];
  importProgress: { done: number; total: number };
  result: string | null;
  error: string | null;

  openModal: () => void;
  closeModal: () => void;
  minimize: () => void;
  restore: () => void;
  startAnalysis: (file: File) => Promise<void>;
  sendToCatalog: () => Promise<void>;
  reset: () => void;
}

const MAX_PRODUCTS = 5000;

export const useAiImportStore = create<AiImportState>()(
  persist(
    (set, get) => ({
      stage: 'idle',
      modalOpen: false,
      minimized: false,
      analyzeStep: { label: '', progress: 0 },
      products: [],
      sheetReports: [],
      issues: [],
      importProgress: { done: 0, total: 0 },
      result: null,
      error: null,

  openModal: () => set({ modalOpen: true, minimized: false }),

  // Fechar o modal NÃO mata o processo: se algo estiver rodando,
  // vira minimizado (balão flutuante assume); sessão de relatório fica guardada
  closeModal: () => {
    const { stage } = get();
    if (stage === 'analyzing' || stage === 'importing') {
      set({ modalOpen: false, minimized: true });
      return;
    }
    if (stage === 'idle') set({ modalOpen: false });
    else set({ modalOpen: false }); // report/done ficam guardados; reabrir mostra o estado
  },

  minimize: () => set({ modalOpen: false, minimized: true }),
  restore: () => set({ modalOpen: true, minimized: false }),

  startAnalysis: async (file) => {
    set({
      stage: 'analyzing',
      error: null,
      result: null,
      products: [],
      sheetReports: [],
      issues: [],
      analyzeStep: { label: 'Lendo abas da planilha...', progress: 10 },
    });
    try {
      const buf = await file.arrayBuffer();
      const sheets = readAllSheets(buf);
      if (sheets.length === 0) throw new Error('Planilha vazia.');

      set({ analyzeStep: { label: 'IA identificando as colunas...', progress: 30 } });
      const mappings: SheetMapping[] = await mapSheetColumns(
        sheets.map((s) => ({ name: s.name, rows: s.sampleRows })),
      );

      set({ analyzeStep: { label: 'Extraindo e convertendo produtos...', progress: 55 } });
      const allIssues: string[] = [];
      const reports: SheetReport[] = [];
      const parsed: ImportProduct[] = [];
      sheets.forEach((sheet, i) => {
        const mapping = mappings[i] ?? { header_row: 0, columns: {}, formats: {}, confidence: 0 };
        const { products: sheetProducts, issues: sheetIssues } = buildProductsFromSheet(sheet, mapping);
        allIssues.push(...sheetIssues);
        reports.push({ name: sheet.name, productCount: sheetProducts.length, mapping });
        parsed.push(...sheetProducts);
      });
      if (parsed.length === 0) {
        throw new Error('A IA não encontrou produtos. Confira se a planilha tem uma coluna com o nome dos itens.');
      }

      const { unique, duplicates } = dedupeProducts(parsed);
      if (duplicates > 0) allIssues.push(`${duplicates} linha(s) duplicada(s) ignorada(s)`);
      if (unique.length > MAX_PRODUCTS) {
        allIssues.push(`Limite de ${MAX_PRODUCTS} produtos por importação — os primeiros ${MAX_PRODUCTS} serão enviados`);
      }
      const finalProducts = unique.slice(0, MAX_PRODUCTS);

      const rawNames = [...new Set(finalProducts.map((p) => p.rawName))];
      const normalized = await normalizeProductNames(rawNames, (done, total) => {
        set({
          analyzeStep: {
            label: `IA padronizando nomes (${done}/${total})...`,
            progress: 65 + Math.round((done / Math.max(total, 1)) * 30),
          },
        });
      });
      applyNormalizedNames(finalProducts, normalized);

      set({
        products: finalProducts,
        sheetReports: reports,
        issues: allIssues,
        analyzeStep: { label: 'Pronto!', progress: 100 },
        stage: 'report',
      });
    } catch (err) {
      console.error('[ai-import] falha na análise:', err);
      const message = (err as Error).message;
      set({
        error: message === 'quota_exceeded'
          ? 'Cota de tokens de IA esgotada neste mês. Compre mais tokens em Agente de IA para importar.'
          : message === 'import_ai_unavailable'
            ? 'A IA da plataforma não está habilitada para sua empresa. Fale com o suporte.'
            : `Não foi possível analisar a planilha: ${message}`,
        stage: 'idle',
      });
    }
  },

  sendToCatalog: async () => {
    const { products } = get();
    if (products.length === 0) return;
    set({ stage: 'importing', error: null, result: null, importProgress: { done: 0, total: products.length } });

    const productRepo = new ProductRepository();
    let existingItems: StockItemForm[] = [];
    try {
      existingItems = (await productRepo.getAll()) as unknown as StockItemForm[];
    } catch { /* sem itens: tudo será criado */ }

    const bySku = new Map(existingItems.map((i) => [String(i.sku ?? '').toLowerCase(), i]));
    const byName = new Map(existingItems.filter((i) => i.name).map((i) => [i.name.trim().toLowerCase(), i]));
    let created = 0;
    let updated = 0;
    const total = products.length;

    for (let i = 0; i < total; i++) {
      const p = products[i];
      const sku = p.sku || `SKU-${Date.now()}-${i}`;
      const existing = (p.sku && bySku.get(p.sku.toLowerCase())) || byName.get(p.name.trim().toLowerCase());
      const payload: Record<string, unknown> = {
        name: p.name,
        ...(p.price !== undefined && { price: p.price }),
        ...(p.cost !== undefined && { cost: p.cost }),
        ...(p.stock_quantity !== undefined && { stock_quantity: p.stock_quantity }),
        ...(p.min_stock_quantity !== undefined && { min_stock_quantity: p.min_stock_quantity }),
        category: p.category || 'Outros',
        ...(p.location && { location: p.location }),
        ...(p.part_type && { part_type: p.part_type }),
        ...(p.device_brand && { device_brand: p.device_brand }),
        ...(p.device_model && { device_model: p.device_model }),
      };
      try {
        if (existing) {
          await productRepo.update(existing.id, payload as never);
          updated++;
        } else {
          await productRepo.create({
            ...payload,
            sku,
            stock_quantity: p.stock_quantity ?? 0,
            active: true,
          } as never);
          created++;
        }
      } catch { /* segue com as próximas linhas */ }
      set({ importProgress: { done: i + 1, total } });
    }

    set({
      result: `${created} produto(s) criado(s) · ${updated} atualizado(s)`,
      stage: 'done',
    });
  },

  reset: () => set({
    stage: 'idle',
    modalOpen: false,
    minimized: false,
    analyzeStep: { label: '', progress: 0 },
    products: [],
    sheetReports: [],
    issues: [],
    importProgress: { done: 0, total: 0 },
    result: null,
    error: null,
    }),
    }),
    {
      name: 'deeperia-ai-import',
      // Persiste só os dados da sessão (ações são recriadas pelo zustand)
      partialize: (s) => ({
        stage: s.stage,
        modalOpen: s.modalOpen,
        minimized: s.minimized,
        analyzeStep: s.analyzeStep,
        products: s.products,
        sheetReports: s.sheetReports,
        issues: s.issues,
        importProgress: s.importProgress,
        result: s.result,
        error: s.error,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || state.stage === 'idle') return;
        // Envio em curso quando a página recarregou: retoma (upsert idempotente)
        if (state.stage === 'importing') {
          void useAiImportStore.getState().sendToCatalog();
          return;
        }
        // Análise em curso foi interrompida pelo reload: o arquivo se perdeu,
        // então avisa em vez de sumir silenciosamente
        if (state.stage === 'analyzing') {
          useAiImportStore.setState({
            stage: 'idle',
            error: 'A análise foi interrompida porque a página foi recarregada. Envie a planilha novamente — depois pode minimizar e continuar usando o sistema.',
          });
        }
      },
    },
  ),
);
