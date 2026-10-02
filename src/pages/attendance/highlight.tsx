import React from 'react';

// Realça em amarelo todas as ocorrências da busca no texto da mensagem
export function highlightText(text: string | undefined, query: string): React.ReactNode {
  if (!text) return null;
  const q = (query ?? '').trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase()
      ? (
        <mark key={i} style={{ background: '#fde047', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>
          {part}
        </mark>
      )
      : part
  );
}
