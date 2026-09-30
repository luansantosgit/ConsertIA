import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Pin, PinOff, MailX, MailOpen } from 'lucide-react';
import type { ConvRow } from './types';

type MenuPos = { top: number; bottom: number; right: number; up: boolean };

// Portal + fixed: mede a viewport na abertura. Imune ao clipping do scroll
// container da lista e aos stacking contexts criados por content-visibility.
export const ConversationMenu = React.memo(function ConversationMenu({
  conv,
  onMarkUnread,
  onTogglePin,
}: {
  conv: ConvRow;
  onMarkUnread: (convId: string) => void;
  onTogglePin: (convId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Fecha ao rolar (a posicao fixed deixaria o menu "flutuando" fora do card)
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect) {
      const up = window.innerHeight - rect.bottom < 200;
      setMenuPos({
        top: rect.bottom + 4,
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
        up,
      });
    }
    setMenuOpen(true);
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)',
    whiteSpace: 'nowrap', textAlign: 'left',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button
        onClick={toggleMenu}
        title="Opções da conversa"
        aria-label="Opções da conversa"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          borderRadius: 6, color: 'var(--text-muted)', opacity: menuOpen ? 1 : 0.35,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = menuOpen ? '1' : '0.35')}
      >
        <Settings size={14} />
      </button>

      {menuOpen && menuPos && createPortal(
        <div ref={dropdownRef} style={{
          position: 'fixed',
          ...(menuPos.up ? { bottom: menuPos.bottom } : { top: menuPos.top }),
          right: menuPos.right,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 1000,
          minWidth: 190,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => {
              if (conv.unread_count === 0) onMarkUnread(conv.id);
              setMenuOpen(false);
            }}
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {conv.unread_count > 0
              ? <><MailOpen size={13} /> Marcar como lida</>
              : <><MailX size={13} /> Marcar como não lida</>}
          </button>
          <button
            onClick={() => { onTogglePin(conv.id); setMenuOpen(false); }}
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {conv.pinned
              ? <><PinOff size={13} /> Desafixar do topo</>
              : <><Pin size={13} /> Fixar no topo</>}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
});
