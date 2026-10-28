import React from 'react';

const QUICK_REPLIES = [
  'Orçamento pronto ✓',
  'Aparelho em bancada',
  'Aguardando aprovação',
  'Pronto para retirada! 🎉'
];

/** Sugestões rápidas acima do input do chat (somem ao gravar áudio) */
export const MessageQuickReplies: React.FC<{ onPick: (text: string) => void }> = ({ onPick }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {QUICK_REPLIES.map(q => (
      <button
        key={q}
        onClick={() => onPick(q)}
        style={{
          fontSize: '0.75rem',
          padding: '4px 10px',
          borderRadius: 99,
          border: '1px solid var(--border)',
          background: 'var(--hover-bg)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'all 0.15s',
        }}
      >
        {q}
      </button>
    ))}
  </div>
);
