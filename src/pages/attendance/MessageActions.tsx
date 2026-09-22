import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Smile, Pencil, Trash2, Forward, Reply } from 'lucide-react';
import type { ChatMessage } from './types';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '❌'];

interface MessageActionsProps {
  msg: ChatMessage;
  hovered: boolean;
  side: 'left' | 'right';
  onReact: (messageId: string, emoji: string) => void;
  onMention: (msg: ChatMessage) => void;
  onStartEdit: () => void;
  onRequestDelete: (messageId: string) => void;
  onForward: (msg: ChatMessage) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  msg,
  hovered,
  side,
  onReact,
  onMention,
  onStartEdit,
  onRequestDelete,
  onForward,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const toggleMenu = () => {
    if (!menuOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 260);
    }
    setMenuOpen(v => !v);
  };

  const isAttendant = msg.from === 'attendant';
  const canModify = isAttendant && !!msg.waMessageId;
  const closeMenu = () => { setMenuOpen(false); setEmojiPicker(false); };

  const opensOutward = (msg.text || '').length < 20;
  const anchor: React.CSSProperties = {};
  if (side === 'right') {
    if (opensOutward) anchor.left = 0; else anchor.right = 0;
  } else {
    if (opensOutward) anchor.right = 0; else anchor.left = 0;
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-primary)',
    transition: 'background 0.1s',
  };

  if (msg.deleted || msg.osCard) return null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <button
        onClick={toggleMenu}
        title="Opções da mensagem"
        aria-label="Opções da mensagem"
        style={{
          background: menuOpen ? '#f1f5f9' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 3,
          borderRadius: '50%',
          color: 'var(--text-muted)',
          opacity: hovered || menuOpen ? 1 : 0,
          pointerEvents: hovered || menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.15s, background 0.15s',
        }}
      >
        <ChevronDown size={16} />
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            ...(openUp ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            ...anchor,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 30,
            minWidth: 170,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setEmojiPicker(v => !v)}
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Smile size={14} /> Reagir
          </button>
          {!isAttendant && (
            <button
              onClick={() => { onMention(msg); closeMenu(); }}
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Reply size={14} /> Mencionar
            </button>
          )}
          {canModify && (
            <button
              onClick={() => { onStartEdit(); closeMenu(); }}
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Pencil size={14} /> Editar
            </button>
          )}
          {canModify && (
            <button
              onClick={() => { onRequestDelete(msg.id); closeMenu(); }}
              style={{ ...itemStyle, color: '#ef4444' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Trash2 size={14} /> Apagar
            </button>
          )}
          <button
            onClick={() => { onForward(msg); closeMenu(); }}
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Forward size={14} /> Encaminhar
          </button>

          {emojiPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 12px 10px', borderTop: '1px solid var(--border)' }}>
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReact(msg.id, emoji); closeMenu(); }}
                  style={{ fontSize: '1.1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
