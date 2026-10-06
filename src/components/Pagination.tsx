import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Componente de paginação reutilizável — recebe total de itens,
// itens por página e a página atual, e renderiza os controles.
export const Pagination: React.FC<{
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}> = ({ page, totalItems, pageSize, onPageChange, label = 'itens' }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Mostra no máximo 5 números de página com reticências
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnStyle: React.CSSProperties = {
    minWidth: 32, height: 32, padding: '0 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, cursor: 'pointer', border: 'none',
    fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600,
    transition: 'background 0.12s, color 0.12s',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '12px 16px', flexWrap: 'wrap',
      borderTop: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {start}–{end} de {totalItems} {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ padding: 4 }}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnStyle,
                background: p === page ? 'var(--primary)' : 'transparent',
                color: p === page ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ padding: 4 }}
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
