import * as XLSX from 'xlsx';
import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { ProductRepository } from '@/repositories/product.repository';
import { SPREADSHEET_COLUMNS, downloadTemplate } from './spreadsheet';
import type { StockItemForm } from './ProductFormModal';

const productRepo = new ProductRepository();

interface ParsedRow {
  raw: Record<string, unknown>;
  name: string;
  sku: string;
}

const normKey = (k: string) =>
  k.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Importação em massa de produtos via planilha .xlsx (arrasta e solta).
// Colunas documentadas + modelo para download; upsert por SKU.
export const ImportProductsModal: React.FC<{
  existingItems: StockItemForm[];
  onClose: () => void;
  onImported: () => void;
}> = ({ existingItems, onClose, onImported }) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setRows(null);
    setInvalid([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsed: ParsedRow[] = [];
      const problems: string[] = [];
      json.forEach((raw, i) => {
        const norm: Record<string, unknown> = {};
        Object.entries(raw).forEach(([k, v]) => { norm[normKey(k)] = v; });
        const name = String(norm['nome'] ?? '').trim();
        const sku = String(norm['sku'] ?? '').trim();
        if (!name && !sku) return;
        if (!name) problems.push(`Linha ${i + 2}: sem nome`);
        // SKU é opcional: vazio = sistema gera automaticamente
        else parsed.push({ raw: norm, name, sku });
      });
      if (parsed.length === 0) {
        setError('Nenhuma linha válida encontrada. Confira se a primeira linha tem os cabeçalhos (nome, sku...).');
      }
      setRows(parsed);
      setInvalid(problems);
    } catch {
      setError('Não foi possível ler o arquivo. Envie uma planilha .xlsx válida.');
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!rows || importing) return;
    setImporting(true);
    setError(null);
    setResult(null);
    const bySku = new Map(existingItems.map(i => [i.sku.toLowerCase(), i]));
    let created = 0;
    let updated = 0;
    const total = rows.length;
    setProgress({ done: 0, total });
    for (let i = 0; i < rows.length; i++) {
      const { raw, name, sku: sheetSku } = rows[i];
      // SKU opcional: vazio = gera automaticamente (como o formulário)
      const sku = sheetSku || `SKU-${Date.now()}-${i}`;
      const existing = sheetSku ? bySku.get(sheetSku.toLowerCase()) : undefined;
      const payload: Record<string, unknown> = { name };
      // [coluna da planilha, coluna do banco, conversão]
      const map: [string, string, (v: unknown) => unknown][] = [
        ['preco', 'price', v => num(v)],
        ['custo', 'cost', v => num(v)],
        ['estoque', 'stock_quantity', v => num(v)],
        ['estoque_minimo', 'min_stock_quantity', v => num(v)],
        ['categoria', 'category', v => String(v || '').trim()],
        ['localizacao', 'location', v => String(v || '').trim()],
        ['marca', 'device_brand', v => String(v || '').trim()],
        ['modelo', 'device_model', v => String(v || '').trim()],
      ];
      for (const [sheetKey, dbKey, conv] of map) {
        const v = raw[sheetKey];
        if (v !== undefined && v !== null && v !== '') payload[dbKey] = conv(v);
      }
      // Converte null/NaN para "não enviar" (update preserva o valor atual)
      (['price', 'cost', 'stock_quantity', 'min_stock_quantity'] as const).forEach(k => {
        if (payload[k] === null) delete payload[k];
      });
      if (!payload['category']) payload['category'] = 'Outros';

      try {
        if (existing) {
          await productRepo.update(existing.id, payload as never);
          updated++;
        } else {
          await productRepo.create({
            ...payload,
            sku,
            stock_quantity: (payload['stock_quantity'] as number) ?? 0,
            active: true,
          } as never);
          created++;
        }
      } catch { /* segue com as próximas linhas */ }
      setProgress({ done: i + 1, total });
    }
    setResult(`${created} produto(s) criado(s) · ${updated} atualizado(s)`);
    setImporting(false);
    onImported();
  };

  return (
    <div className="modal-overlay" onClick={importing ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Importar Produtos (planilha)</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={importing} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Documentação das colunas */}
          <div style={{ padding: 12, background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Colunas da planilha (cabeçalho na primeira linha)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SPREADSHEET_COLUMNS.map(c => (
                <p key={c.key} style={{ margin: 0, fontSize: '0.75rem' }}>
                  <code style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 }}>{c.label}</code>
                  {c.required && <strong style={{ color: 'var(--danger)' }}> *</strong>}
                  <span style={{ color: 'var(--text-muted)' }}> — {c.hint}</span>
                </p>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={downloadTemplate}>
              <Download size={13} /> Baixar modelo (.xlsx)
            </button>
          </div>

          {/* Arrasta e solta */}
          {!rows && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) parseFile(file);
              }}
              onClick={() => !parsing && inputRef.current?.click()}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '32px 16px', borderRadius: 12, cursor: parsing ? 'wait' : 'pointer',
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                background: dragOver ? 'var(--primary-light)' : 'transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {parsing ? (
                <>
                  <UploadCloud size={28} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>Lendo planilha...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={28} color="var(--primary)" />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Arraste a planilha .xlsx aqui</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ou clique para escolher o arquivo</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) parseFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

          {/* Prévia da leitura */}
          {rows && (
            <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#16a34a" />
                {rows.length} linha(s) válida(s) prontas para importar
              </p>
              {invalid.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {invalid.length} linha(s) ignorada(s): {invalid.slice(0, 3).join(' · ')}
                    {invalid.length > 3 ? ` e mais ${invalid.length - 3}` : ''}
                  </p>
                </div>
              )}
              {importing ? (
                <div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 99, width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`, transition: 'width 0.2s' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Importando {progress.done} de {progress.total}...
                  </p>
                </div>
              ) : result ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} /> {result}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => { setRows(null); setResult(null); }}>
                      Importar outra planilha
                    </button>
                    <button className="btn btn-primary" onClick={onClose}>
                      Concluir
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={runImport}>
                    Importar {rows.length} produto(s)
                  </button>
                  <button className="btn btn-ghost" onClick={() => setRows(null)}>Escolher outra planilha</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
