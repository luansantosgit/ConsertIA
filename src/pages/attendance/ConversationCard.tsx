import React from 'react';
import { Pin, Users, Bot, UserCheck } from 'lucide-react';
import type { ConvRow } from './types';
import { timeAgo } from './types';
import { ConversationMenu } from './ConversationMenu';

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
          </span>
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Portal + fixed: imune ao clipping da lista e aos stacking contexts
            dos cards com content-visibility */}
        <ConversationMenu conv={conv} onMarkUnread={onMarkUnread} onTogglePin={onTogglePin} />

        {conv.ai_state && conv.ai_state !== 'off' && (
          <button
            title={conv.ai_state === 'paused'
              ? 'Com atendente — clique para devolver ao agente de IA'
              : conv.ai_state === 'attending'
                ? 'IA atendendo — clique para assumir o atendimento'
                : 'Transferida pelo agente de IA — clique para devolver ao agente'}
            onClick={e => { e.stopPropagation(); onAiClick(conv); }}
            style={{
              width: 26, height: 26, padding: 0, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 7, cursor: 'pointer',
              border: '1px solid',
              borderColor: conv.ai_state === 'attending' ? '#c4b5fd' : '#6ee7b7',
              background: conv.ai_state === 'attending' ? '#ede9fe' : '#d1fae5',
              transition: 'transform 0.12s, filter 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {conv.ai_state === 'attending'
              ? <Bot size={14} color="#8b5cf6" />
              : <UserCheck size={14} color="#059669" />}
          </button>
        )}
      </div>
    </div>
  );
});
