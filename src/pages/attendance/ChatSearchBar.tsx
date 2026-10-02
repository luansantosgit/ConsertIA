import React, { useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

// Barra de busca na conversa: localiza palavras/frases, conta e navega
// entre as ocorrências com realce nas mensagens.
export const ChatSearchBar: React.FC<{
  query: string;
  onQueryChange: (v: string) => void;
  matchCount: number;
  matchIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}> = ({ query, onQueryChange, matchCount, matchIndex, onPrev, onNext, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.shiftKey ? onPrev() : onNext();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 20px',
      borderBottom: '1px solid var(--border)',
      background: '#fff',
      animation: 'slideDown 0.15s ease',
    }}>
      <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <input
        ref={inputRef}
        className="input"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar palavra ou frase na conversa..."
        style={{ flex: 1, fontSize: '0.8125rem', padding: '6px 10px', marginBottom: 0 }}
      />
      <span style={{
        fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0,
        fontVariantNumeric: 'tabular-nums', minWidth: 46, textAlign: 'center',
      }}>
        {matchCount > 0 ? `${matchIndex + 1} de ${matchCount}` : query ? '0' : ''}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onPrev}
        disabled={matchCount === 0}
        title="Ocorrência anterior (Shift+Enter)"
        style={{ padding: 4 }}
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onNext}
        disabled={matchCount === 0}
        title="Próxima ocorrência (Enter)"
        style={{ padding: 4 }}
      >
        <ChevronDown size={14} />
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onClose}
        title="Fechar busca (Esc)"
        style={{ padding: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
