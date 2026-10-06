import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Search, Filter, UserCheck, Check, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { SkeletonLine, SkeletonCircle } from '@/components/Skeleton';
import type { ConvRow } from './types';
import { ConversationCard } from './ConversationCard';

export type ChatFilter = 'all' | 'chats' | 'groups' | 'transferred_chats' | 'transferred_groups';

interface ConversationSidebarProps {
  conversations: ConvRow[];
  filtered: ConvRow[];
  selectedId: string;
  search: string;
  chatFilter: ChatFilter;
  sortBy: 'recent' | 'unread' | 'oldest';
  loadingConversations: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onSearchChange: (value: string) => void;
  onChatFilterChange: (value: ChatFilter) => void;
  onSortChange: (value: 'recent' | 'unread' | 'oldest') => void;
  onLoadMore: () => void;
  onSelectConversation: (conv: ConvRow) => void;
  onMarkUnread: (convId: string) => void;
  onTogglePin: (convId: string) => void;
  onAiClick: (conv: ConvRow) => void;
}

const MAIN_FILTERS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'chats', label: 'Chats' },
  { key: 'groups', label: 'Grupos' },
];

const SORT_OPTIONS: { key: 'recent' | 'unread' | 'oldest'; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'recent', label: 'Mais recentes', icon: Clock },
  { key: 'unread', label: 'Não lidas primeiro', icon: ArrowUp },
  { key: 'oldest', label: 'Mais antigas', icon: ArrowDown },
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
  const [dropdownFor, setDropdownFor] = useState<string | null>(null);
  const filterBtnRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown do funil ao clicar fora
  useEffect(() => {
    if (!dropdownFor) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Deixa o FilterDropdown interno gerenciar o próprio outside-click
      if (filterBtnRef.current?.contains(target)) return;
      if (dropdownFor !== 'filter') return;
      setDropdownFor(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownFor]);

  // Contadores de chats com mensagens nao lidas (nao a soma de mensagens),
  // sincronizados em tempo real via conversations
  const unreadByFilter = useMemo(() => {
    const acc: Record<string, number> = { all: 0, chats: 0, groups: 0, transferred_chats: 0, transferred_groups: 0 };
    for (const c of conversations) {
      if (c.unread_count > 0) {
        acc.all++;
        if (c.is_group) acc.groups++;
        else acc.chats++;
      }
      if (c.ai_state === 'paused' && c.unread_count > 0) {
        if (c.is_group) acc.transferred_groups++;
        else acc.transferred_chats++;
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
      entries => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shouldLoadMore, onLoadMore]);

  // Filtro ativo de transferidos
  const transferredActive = chatFilter === 'transferred_chats' || chatFilter === 'transferred_groups';

  return (
    <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid var(--border)', minHeight: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 0.8, color: 'var(--text-muted)',
        }}>
          Atendimento
        </span>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 0 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Buscar cliente, aparelho..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              style={{ fontSize: '0.8125rem' }}
            />
          </div>
          <div ref={filterBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDropdownFor(dropdownFor === 'filter' ? null : 'filter')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: transferredActive || dropdownFor === 'filter' ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.15s',
              }}
              title="Filtros e ordenação"
            >
              <Filter
                size={15}
                style={{ opacity: transferredActive || dropdownFor === 'filter' ? 1 : 0.6 }}
                fill={transferredActive ? 'var(--primary-light)' : 'none'}
              />
            </button>
            {dropdownFor === 'filter' && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100,
                minWidth: 190, overflow: 'hidden',
                animation: 'slideUp 0.15s ease',
              }}>
                {[
                  { key: 'transferred_chats' as ChatFilter, label: 'Chats transferidos', icon: UserCheck },
                  { key: 'transferred_groups' as ChatFilter, label: 'Grupos transferidos', icon: UserCheck },
                ].map(o => (
                  <button
                    key={o.key}
                    onClick={() => { onChatFilterChange(o.key); setDropdownFor(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '10px 14px', border: 'none',
                      cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
                      textAlign: 'left',
                      background: chatFilter === o.key ? 'var(--primary-light)' : 'transparent',
                      color: chatFilter === o.key ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: chatFilter === o.key ? 600 : 400,
                    }}
                  >
                    <o.icon size={14} />
                    {o.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { onSortChange(o.key); setDropdownFor(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '10px 14px', border: 'none',
                      cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
                      textAlign: 'left',
                      background: sortBy === o.key ? 'var(--primary-light)' : 'transparent',
                      color: sortBy === o.key ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: sortBy === o.key ? 600 : 400,
                    }}
                  >
                    <o.icon size={14} />
                    {o.label}
                    {sortBy === o.key && <Check size={12} color="var(--primary)" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {MAIN_FILTERS.map(f => {
            const isThisBase = chatFilter === f.key ||
              (f.key === 'chats' && chatFilter === 'transferred_chats') ||
              (f.key === 'groups' && chatFilter === 'transferred_groups');
            return (
              <button
                key={f.key}
                onClick={() => onChatFilterChange(f.key)}
                className={`btn btn-sm btn-pill ${isThisBase ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {f.label}
                {transferredActive && isThisBase && (
                  <UserCheck size={11} style={{ flexShrink: 0 }} />
                )}
                {unreadByFilter[f.key] > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                    background: 'var(--danger)', color: '#fff', fontSize: '0.625rem',
                    fontWeight: 700, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', lineHeight: 1,
                  }}>
                    {unreadByFilter[f.key] > 99 ? '99+' : unreadByFilter[f.key]}
                  </span>
                )}
              </button>
            );
          })}
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
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
              {chatFilter.startsWith('transferred')
                ? 'Nenhuma conversa transferida pela IA'
                : chatFilter === 'groups' ? 'Nenhum grupo' : 'Nenhuma conversa'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {chatFilter.startsWith('transferred')
                ? 'Quando a IA transferir um atendimento para você, ele aparecerá aqui.'
                : chatFilter === 'groups'
                  ? 'Grupos do WhatsApp aparecerão aqui'
                  : 'Clique em "Nova Conversa" para iniciar'}
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
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ padding: '8px 16px' }}>
            <SkeletonLine width="70%" height={12} />
          </div>
        )}
      </div>
    </div>
  );
};
