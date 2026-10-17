import React from 'react';
import { CheckCircle2, AlertTriangle, Sparkles, ListChecks } from 'lucide-react';
import type { ImportProduct } from './ai-import-parse';
import type { SheetReport } from './ai-import-parse';
import { formatCurrency } from '@/lib/format';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  sku: 'SKU',
  price: 'Preço',
  cost: 'Custo',
  stock_quantity: 'Estoque',
  min_stock_quantity: 'Estoque mín.',
  category: 'Categoria',
  location: 'Localização',
  device_brand: 'Marca',
  device_model: 'Modelo',
};

/**
 * Relatório de leitura da IA: o usuário examina o que foi entendido
 * (contagem, mapeamento por aba, prévia e problemas) ANTES de enviar
 * os produtos para o catálogo.
 */
export const AiImportReport: React.FC<{
  products: ImportProduct[];
  sheets: SheetReport[];
  issues: string[];
  previewLimit?: number;
}> = ({ products, sheets, issues, previewLimit = 30 }) => {
  const withPrice = products.filter((p) => typeof p.price === 'number');
  const avgPrice = withPrice.length
    ? withPrice.reduce((a, p) => a + (p.price ?? 0), 0) / withPrice.length
    : null;
  const totalStock = products.reduce((a, p) => a + (p.stock_quantity ?? 0), 0);
  const aiNamed = products.filter((p) => p.name !== p.rawName).length;
  const usedSheets = sheets.filter((s) => s.productCount > 0);
  const preview = products.slice(0, previewLimit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Produtos lidos', value: String(products.length), color: 'var(--primary-text)' },
          { label: 'Abas usadas', value: `${usedSheets.length}/${sheets.length}`, color: '#7c3aed' },
          { label: 'Nomes padronizados', value: String(aiNamed), color: 'var(--success)' },
          { label: 'Itens em estoque', value: String(totalStock), color: 'var(--info-text)' },
        ].map((m) => (
          <div key={m.label} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{m.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: m.color, lineHeight: 1.2 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Mapeamento por aba */}
      <div style={{ padding: 12, background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="var(--primary-text)" /> O que a IA entendeu
        </p>
        {sheets.map((s) => (
          <div key={s.name} style={{ marginBottom: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', fontWeight: 600 }}>
              {s.name}
              {s.productCount > 0
                ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — {s.productCount} produto(s) · confiança {Math.round((s.mapping.confidence ?? 0) * 100)}%</span>
                : <span style={{ fontWeight: 400, color: 'var(--warning-text)' }}> — não parece uma tabela de produtos</span>}
            </p>
            {s.productCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.entries(s.mapping.columns).map(([field, idx]) => (
                  <span key={field} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 99, background: 'var(--primary-light)', color: 'var(--primary-text)', fontWeight: 600 }}>
                    {FIELD_LABELS[field] ?? field} → coluna {idx}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Problemas */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 10 }}>
          <AlertTriangle size={15} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            {issues.slice(0, 4).map((issue, i) => (
              <p key={i} style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warning-text)' }}>{issue}</p>
            ))}
            {issues.length > 4 && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>e mais {issues.length - 4} aviso(s)</p>
            )}
          </div>
        </div>
      )}

      {/* Prévia */}
      <div>
        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ListChecks size={13} /> Prévia {avgPrice !== null && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· preço médio {formatCurrency(avgPrice)}</span>}
        </p>
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: 'var(--hover-bg)' }}>
                {['Produto', 'SKU', 'Preço', 'Custo', 'Estoque', 'Categoria', 'Marca', 'Modelo', 'Tipo'].map((h) => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--hover-bg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                    {p.name}
                    {p.name !== p.rawName && (
                      <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 400 }}>era: {p.rawName.slice(0, 40)}{p.rawName.length > 40 ? '…' : ''}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{p.sku || <span style={{ color: 'var(--text-muted)' }}>auto</span>}</td>
                  <td style={{ padding: '6px 10px' }}>{typeof p.price === 'number' ? formatCurrency(p.price) : '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{typeof p.cost === 'number' ? formatCurrency(p.cost) : '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{p.stock_quantity ?? '—'}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{p.category || 'Outros'}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{p.device_brand || '—'}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{p.device_model || '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{p.part_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length > previewLimit && (
          <p style={{ margin: '6px 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <CheckCircle2 size={11} style={{ verticalAlign: -1 }} /> e mais {products.length - previewLimit} produto(s)…
          </p>
        )}
      </div>
    </div>
  );
};
