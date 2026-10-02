import React, { useEffect, useMemo, useState } from 'react';
import { Zap, FileText, Image as ImageIcon } from 'lucide-react';
import type { QuickReply } from '@/repositories/quick-reply.repository';

// Lista de respostas rápidas que aparece SOB o input do chat ao
// digitar "/" (como no WhatsApp Web). Inclui a ação "Enviar OS".
export const QuickReplyPicker: React.FC<{
  query: string;
  replies: QuickReply[];
  onPick: (reply: QuickReply) => void;
  onPickOS: () => void;
  onClose: () => void;
}> = ({ query, replies, onPick, onPickOS, onClose }) => {
  const term = query.trim().toLowerCase();
  const filtered = useMemo(
    () => replies.filter(r => !term || r.shortcut.includes(term) || r.title.toLowerCase().includes(term)),
    [replies, term]
  );
  const [cursor, setCursor] = useState(0);

  useEffect(() => { setCursor(0); }, [term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      const total = filtered.length + 1; // +1 = entrada Enviar OS
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(c => (c + 1) % total);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(c => (c - 1 + total) % total);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (cursor === 0) {
          onPickOS();
        } else {
          const reply = filtered[cursor - 1];
          if (reply) onPick(reply);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [filtered, cursor, onPick, onPickOS, onClose]);

  if (filtered.length === 0 && term) return null;

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
    background: active ? 'var(--primary-light)' : 'transparent',
    transition: 'background 0.1s',
  });

  return (
    <div style={{
      margin: '0 20px', padding: 6, background: '#fff',
      border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      maxHeight: 240, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 2,
      animation: 'slideUp 0.15s ease',
    }}>
      <div
        onMouseEnter={() => setCursor(0)}
        onClick={onPickOS}
        style={rowStyle(cursor === 0)}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: '#dbeafe', color: '#1d4ed8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileText size={15} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Enviar OS do cliente
          </p>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Escolha uma ordem de serviço para enviar com detalhes
          </p>
        </div>
      </div>

      {filtered.map((r, i) => {
        const idx = i + 1;
        const hasMedia = r.parts.some(p => p.type === 'media');
        return (
          <div
            key={r.id}
            onMouseEnter={() => setCursor(idx)}
            onClick={() => onPick(r)}
            style={rowStyle(cursor === idx)}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hasMedia ? <ImageIcon size={15} /> : <Zap size={15} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                /{r.shortcut}
              </p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.title}{r.parts.length > 1 ? ` · ${r.parts.length} partes` : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
