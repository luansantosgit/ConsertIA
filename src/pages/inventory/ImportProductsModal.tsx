import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, Sparkles, RefreshCw, Minimize2 } from 'lucide-react';
import { useAiImportStore } from '@/stores/ai-import.store';
import { AiImportReport } from './AiImportReport';

/**
 * Modal de importação com IA — view da sessão global (ai-import.store).
 * O processo sobrevive a minimizar/navegar; o balão flutuante acompanha.
 */
export const ImportProductsModal: React.FC<{
  onClose: () => void;
  onImported: () => void;
}> = ({ onClose, onImported }) => {
  const {
    stage, analyzeStep, products, sheetReports, issues, doubts, clarifyingKey,
    importProgress, result, error,
    startAnalysis, sendToCatalog, applyClarification, discardDoubt, skipDoubt, minimize, reset,
  } = useAiImportStore();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = stage === 'analyzing' || stage === 'importing';

  const handleFile = (file: File) => void startAnalysis(file);

  const finishImport = async () => {
    await sendToCatalog();
    onImported();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--primary-text)" /> Importar com IA
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {busy && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={minimize}
                title="Minimizar — o processo continua e um balão mostra o andamento"
              >
                <Minimize2 size={14} /> Minimizar
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

          {/* Etapa 1: upload (idle) */}
          {stage === 'idle' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
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
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>.xlsx · .xls · .csv — até 5.000 produtos</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
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
                Pode minimizar e fazer outra coisa — avisamos quando terminar. Os produtos só entram no catálogo quando você confirmar.
              </p>
            </div>
          )}

          {/* Etapa 3: relatório para examinar */}
          {stage === 'report' && (
            <>
              <AiImportReport
                products={products}
                sheets={sheetReports}
                issues={issues}
                doubts={doubts}
                clarifyingKey={clarifyingKey}
                onClarify={(key, meaning) => void applyClarification(key, meaning)}
                onDiscardDoubt={discardDoubt}
                onSkipDoubt={skipDoubt}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button className="btn btn-ghost" onClick={reset}>Descartar</button>
                <button className="btn btn-primary" onClick={finishImport}>
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
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Pode minimizar — o envio continua. Não é preciso ficar nesta janela.</p>
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
