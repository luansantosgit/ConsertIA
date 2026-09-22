import React, { useState, useRef, useEffect } from 'react';
import { Settings, Pin, PinOff, MailX, MailOpen, Users, Bot, UserCheck } from 'lucide-react';
import type { ConvRow } from './types';
import { timeAgo } from './types';

// React.memo: com 500/1000+ chats, re-renderiza apenas a card cuja row mudou
// (callbacks do pai sao estaveis via useCallback e a identidade da row so muda
// quando a conversa em questao e atualizada no estado).
export const ConversationCard = React.memo(function ConversationCard({
  conv,
  isSelected,
  onSelect,
  onMarkUnread,
  onTogglePin,
  onAiClick,
}: {
  conv: ConvRow;
  isSelected: boolean;
  onSelect: (conv: ConvRow) => void;
  onMarkUnread: (convId: string) => void;
  onTogglePin: (convId: string) => void;
  onAiClick: (conv: ConvRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const markUnread = (toUnread: boolean) => {
    if (!toUnread) return;
    onMarkUnread(conv.id);
    setMenuOpen(false);
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)',
    whiteSpace: 'nowrap', textAlign: 'left',
  };

  return (
    <div
      onClick={() => onSelect(conv)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '13px 16px',
        borderBottom: '1px solid #f5f6fb',
        cursor: 'pointer',
        transition: 'background 0.12s',
        background: isSelected ? 'var(--primary-light)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
        // Virtualizacao CSS: o browser pula render/layout fora do viewport
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 67px',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: conv.contactAvatar ? 'transparent' : 'var(--primary-light)',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.875rem',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {conv.contactAvatar ? (
          <img src={conv.contactAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          conv.contactName.charAt(0)
        )}
        {conv.status === 'open' && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #fff'
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            {conv.is_group && <Users size={11} color="var(--primary)" style={{ flexShrink: 0 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.contactName}</span>
            {conv.pinned && <Pin size={11} color="var(--primary)" fill="var(--primary)" style={{ flexShrink: 0 }} />}
            {conv.ai_state === 'attending' && (
              <span
                title="IA atendendo — clique para assumir o atendimento"
                style={{ display: 'flex', flexShrink: 0, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onAiClick(conv); }}
              >
                <Bot size={13} color="#8b5cf6" fill="#ede9fe" />
              </span>
            )}
            {(conv.ai_state === 'handed_off' || conv.ai_state === 'paused') && (
              <span
                title={conv.ai_state === 'paused' ? 'Com atendente — clique para devolver ao agente de IA' : 'Transferida para atendente — clique para assumir'}
                style={{ display: 'flex', flexShrink: 0, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onAiClick(conv); }}
              >
                <UserCheck size={13} color="#10b981" />
              </span>
            )}          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(conv.last_message_at!)}</span>
        </div>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {conv.lastMessage ? (
            <><strong>{conv.deviceInfo}</strong> · {conv.lastMessage}</>
          ) : (
            <>{conv.contact_phone}</>
          )}
        </p>
      </div>

      {conv.unread_count > 0 && (
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#fff',
          fontSize: '0.6875rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {conv.unread_count}
        </div>
      )}

      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(v => !v)}
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

        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 30,
            minWidth: 190,
            overflow: 'hidden',
            marginTop: 4,
          }}>
            <button
              onClick={() => markUnread(conv.unread_count === 0)}
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
          </div>
        )}
      </div>
    </div>
  );
});
