import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { ProductRepository } from '@/repositories/product.repository';
import { mapSheetColumns, normalizeProductNames, type SheetMapping } from '@/lib/ai-import.service';
import { AiImportReport } from './AiImportReport';
import {
  readAllSheets, buildProductsFromSheet, dedupeProducts, applyNormalizedNames,
  type ImportProduct, type SheetReport,
} from './ai-import-parse';
import type { StockItemForm } from './ProductFormModal';

const productRepo = new ProductRepository();
const MAX_PRODUCTS = 5000;

type Stage = 'drop' | 'analyzing' | 'report' | 'importing' | 'done';

interface AnalyzeStep { label: string; progress: number }

/**
 * Importação inteligente: o usuário envia a planilha DO JEITO DELE
 * (qualquer formato, várias abas) e a IA entende, padroniza e apresenta
 * um relatório para conferência antes de enviar ao catálogo.
 */
export const ImportProductsModal: React.FC<{
  existingItems: StockItemForm[];
  onClose: () => void;
  onImported: () => void;
}> = ({ existingItems, onClose, onImported }) => {
  const [stage, setStage] = useState<Stage>('drop');
  const [dragOver, setDragOver] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>({ label: '', progress: 0 });
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [sheetReports, setSheetReports] = useState<SheetReport[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('drop');
    setProducts([]);
    setSheetReports([]);
    setIssues([]);
    setError(null);
    setResult(null);
    setAnalyzeStep({ label: '', progress: 0 });
  };

  const analyzeFile = async (file: File) => {
    setError(null);
    setStage('analyzing');
    try {
      setAnalyzeStep({ label: 'Lendo abas da planilha...', progress: 10 });
      const buf = await file.arrayBuffer();
      const sheets = readAllSheets(buf);
      if (sheets.length === 0) throw new Error('Planilha vazia.');

      setAnalyzeStep({ label: 'IA identificando as colunas...', progress: 30 });
      const mappings: SheetMapping[] = await mapSheetColumns(
        sheets.map((s) => ({ name: s.name, rows: s.sampleRows })),
      );

      setAnalyzeStep({ label: 'Extraindo e convertendo produtos...', progress: 55 });
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

      setAnalyzeStep({ label: 'IA padronizando nomes...', progress: 65 });
      const rawNames = [...new Set(finalProducts.map((p) => p.rawName))];
      const normalized = await normalizeProductNames(rawNames, (done, total) => {
        setAnalyzeStep({
          label: `IA padronizando nomes (${done}/${total})...`,
          progress: 65 + Math.round((done / Math.max(total, 1)) * 30),
        });
      });
      applyNormalizedNames(finalProducts, normalized);

      setAnalyzeStep({ label: 'Pronto!', progress: 100 });
      setProducts(finalProducts);
      setSheetReports(reports);
      setIssues(allIssues);
      setStage('report');
    } catch (err) {
      console.error('[ai-import] falha na análise:', err);
      const message = (err as Error).message;
      setError(
        message === 'quota_exceeded'
          ? 'Cota de tokens de IA esgotada neste mês. Compre mais tokens em Agente de IA para importar.'
          : message === 'import_ai_unavailable'
            ? 'A IA da plataforma não está habilitada para sua empresa. Fale com o suporte.'
            : `Não foi possível analisar a planilha: ${message}`,
      );
      setStage('drop');
    }
  };

  const sendToCatalog = async () => {
    if (products.length === 0) return;
    setStage('importing');
    setError(null);
    setResult(null);

    const bySku = new Map(existingItems.map((i) => [i.sku.toLowerCase(), i]));
    const byName = new Map(existingItems.filter((i) => i.name).map((i) => [i.name.trim().toLowerCase(), i]));
    let created = 0;
    let updated = 0;
    const total = products.length;
    setImportProgress({ done: 0, total });

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
      setImportProgress({ done: i + 1, total });
    }

    setResult(`${created} produto(s) criado(s) · ${updated} atualizado(s)`);
    setStage('done');
    onImported();
  };

  const busy = stage === 'analyzing' || stage === 'importing';

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--primary-text)" /> Importar com IA
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

          {/* Etapa 1: upload */}
          {stage === 'drop' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void analyzeFile(file);
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '44px 16px', borderRadius: 12, cursor: 'pointer',
                border: `2px dashed ${dragOver ? 'var(--primary-text)' : 'var(--border)'}`,
                background: dragOver ? 'var(--primary-light)' : 'transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <FileSpreadsheet size={32} color="var(--primary-text)" />
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>Arraste a planilha do jeito que você tiver</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 380 }}>
                Qualquer formato, uma ou várias abas. A IA lê, entende as colunas, padroniza os nomes
                e mostra um relatório para você conferir antes de enviar ao catálogo.
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>.xlsx · .xls · .csv — até {MAX_PRODUCTS} produtos</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void analyzeFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {/* Etapa 2: análise com IA */}
          {stage === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '36px 0' }}>
              <UploadCloud size={32} color="var(--primary-text)" style={{ animation: 'float 2s ease-in-out infinite' }} />
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{analyzeStep.label}</p>
              <div style={{ width: '100%', maxWidth: 360 }}>
                <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 99, width: `${analyzeStep.progress}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Isso costuma levar menos de um minuto. Os produtos só entram no catálogo quando você confirmar.
              </p>
            </div>
          )}

          {/* Etapa 3: relatório para examinar */}
          {stage === 'report' && (
            <>
              <AiImportReport products={products} sheets={sheetReports} issues={issues} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button className="btn btn-ghost" onClick={reset} disabled={busy}>Enviar outra planilha</button>
                <button className="btn btn-primary" onClick={sendToCatalog}>
                  <CheckCircle2 size={15} /> Enviar {products.length} produto(s) para o catálogo
                </button>
              </div>
            </>
          )}

          {/* Etapa 4: gravação no banco */}
          {stage === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 0' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                Enviando {importProgress.done} de {importProgress.total} produto(s)...
              </p>
              <div style={{ height: 8, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 99, width: `${(importProgress.done / Math.max(importProgress.total, 1)) * 100}%`, transition: 'width 0.15s' }} />
              </div>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Você pode acompanhar o progresso. Não feche esta janela.</p>
            </div>
          )}

          {/* Etapa 5: concluído */}
          {stage === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={40} color="var(--success)" />
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>{result}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={reset}>
                  <RefreshCw size={14} /> Importar outra planilha
                </button>
                <button className="btn btn-primary" onClick={onClose}>Concluir</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
