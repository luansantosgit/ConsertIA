import React, { useState, useRef, useEffect } from 'react';
import { Check, Filter } from 'lucide-react';

export type ConvSortMode = 'recent' | 'unread' | 'oldest';

const SORT_OPTIONS: { key: ConvSortMode; label: string }[] = [
  { key: 'recent', label: 'Mais recentes' },
  { key: 'unread', label: 'Não lidas primeiro' },
  { key: 'oldest', label: 'Mais antigas' },
];

interface ConversationSortMenuProps {
  sortBy: ConvSortMode;
  onChange: (value: ConvSortMode) => void;
}

/** Menu de filtro/ordenacao das conversas, no padrao do WhatsApp Web */
export const ConversationSortMenu: React.FC<ConversationSortMenuProps> = ({ sortBy, onChange }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isActive = sortBy !== 'recent';

  return (
    <div ref={menuRef} style={{ position: 'relative', marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Filtrar conversas"
        aria-label="Filtrar conversas"
        aria-expanded={open}
        style={{
          background: open ? 'var(--primary-light)' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 5,
          borderRadius: '50%',
          color: open || isActive ? 'var(--primary)' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'var(--primary)'; }}
        onMouseLeave={e => { if (!open && !isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Filter size={14} />
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            minWidth: 190,
            padding: 6,
            zIndex: 200,
            animation: 'slideUp 0.15s ease',
          }}
        >
          <p style={{
            fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)',
            padding: '6px 10px', textTransform: 'uppercase', letterSpacing: 0.3,
          }}>
            Ordenar por
          </p>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.8125rem', fontWeight: sortBy === o.key ? 600 : 400,
                color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
                textAlign: 'left', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 14, display: 'flex', flexShrink: 0 }}>
                {sortBy === o.key && <Check size={13} color="var(--primary)" />}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
