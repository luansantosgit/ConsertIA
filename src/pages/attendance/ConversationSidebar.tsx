import React, { useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { SkeletonLine, SkeletonCircle } from '@/components/Skeleton';
import type { ConvRow } from './types';
import { ConversationCard } from './ConversationCard';
import { ConversationSortMenu } from './ConversationSortMenu';

interface ConversationSidebarProps {
  conversations: ConvRow[];
  filtered: ConvRow[];
  selectedId: string;
  search: string;
  chatFilter: 'all' | 'chats' | 'groups';
  sortBy: 'recent' | 'unread' | 'oldest';
  loadingConversations: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onSearchChange: (value: string) => void;
  onChatFilterChange: (value: 'all' | 'chats' | 'groups') => void;
  onSortChange: (value: 'recent' | 'unread' | 'oldest') => void;
  onLoadMore: () => void;
  onSelectConversation: (conv: ConvRow) => void;
  onMarkUnread: (convId: string) => void;
  onTogglePin: (convId: string) => void;
  onAiClick: (conv: ConvRow) => void;
}

const CHAT_FILTERS: { key: 'all' | 'chats' | 'groups'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'chats', label: 'Chats' },
  { key: 'groups', label: 'Grupos' },
];

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  filtered,
  selectedId,
  search,
  chatFilter,
  sortBy,
  loadingConversations,
  hasMore,
  loadingMore,
  onSearchChange,
  onChatFilterChange,
  onSortChange,
  onLoadMore,
  onSelectConversation,
  onMarkUnread,
  onTogglePin,
  onAiClick,
}) => {
  // Contadores de chats com mensagens nao lidas (nao a soma de mensagens),
  // sincronizados em tempo real via conversations
  const unreadByFilter = useMemo(() => {
    const acc = { all: 0, chats: 0, groups: 0 };
    for (const c of conversations) {
      if (c.unread_count > 0) {
        acc.all++;
        if (c.is_group) acc.groups++;
        else acc.chats++;
      }
    }
    return acc;
  }, [conversations]);

  // Infinite scroll: sentinel no fim da lista dispara o load da proxima pagina
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shouldLoadMore = hasMore && !loadingMore && !loadingConversations;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !shouldLoadMore) return;
    const observer = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) onLoadMore(); },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shouldLoadMore, onLoadMore]);

  return (
    <div style={{
      width: 320,
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      background: '#fff'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Conversas</h3>
          <span className="badge badge-danger">
            {unreadByFilter.all} {unreadByFilter.all === 1 ? 'não lida' : 'não lidas'}
          </span>
        </div>
        <div className="search-wrap" style={{ marginBottom: 10 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder="Buscar cliente, aparelho..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {CHAT_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onChatFilterChange(f.key)}
              className={`btn btn-sm btn-pill ${chatFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {f.label}
              {unreadByFilter[f.key] > 0 && (
                <span style={{
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {unreadByFilter[f.key] > 99 ? '99+' : unreadByFilter[f.key]}
                </span>
              )}
            </button>
          ))}
          <ConversationSortMenu sortBy={sortBy} onChange={onSortChange} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingConversations && conversations.length === 0 && (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <SkeletonCircle width={40} height={40} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonLine width="60%" height={12} />
                  <SkeletonLine width="85%" height={10} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loadingConversations && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {chatFilter === 'groups' ? 'Nenhum grupo' : 'Nenhuma conversa'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {chatFilter === 'groups' ? 'Grupos do WhatsApp aparecerão aqui' : 'Clique em "Nova Conversa" para iniciar'}
            </p>
          </div>
        )}
        {filtered.map(conv => (
          <ConversationCard
            key={conv.id}
            conv={conv}
            isSelected={conv.id === selectedId}
            onSelect={onSelectConversation}
            onMarkUnread={onMarkUnread}
            onTogglePin={onTogglePin}
            onAiClick={onAiClick}
          />
        ))}
        {shouldLoadMore && (
          <div
            ref={sentinelRef}
            style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}
          >
            {loadingMore ? (
              <SkeletonLine width="40%" height={10} />
            ) : (
              'Carregar mais conversas...'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
