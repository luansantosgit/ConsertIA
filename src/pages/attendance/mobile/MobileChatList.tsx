import React, { useEffect, useRef, useState } from 'react';
import { Plus, MoreVertical, Sun, Moon, LogOut, Download } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useModeStore } from '@/stores/mode.store';
import { useTranslation } from '@/hooks/useTranslation';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { ConversationSidebar } from '../ConversationSidebar';
import type { MobileListConfig } from './types';

/** Tela 1 do modo mobile: lista de conversas em tela cheia + FAB, como no WhatsApp. */
export const MobileChatList: React.FC<MobileListConfig> = ({ m }) => {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useModeStore();
  const { t } = useTranslation();
  const { canInstall, promptInstall } = usePwaInstall();
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

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 16px', border: 'none',
    cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit',
    textAlign: 'left', background: 'transparent', color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="m-list">
      <header className="m-list-header">
        <h1 className="m-list-title">{user?.tenantName || t('Atendimento')}</h1>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setMenuOpen(v => !v)}
            title={t('Mais opções')}
            aria-label={t('Mais opções')}
            style={{ width: 38, height: 38 }}
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div className="m-menu-dropdown">
              {canInstall && (
                <button
                  style={menuItemStyle}
                  onClick={() => { setMenuOpen(false); void promptInstall(); }}
                >
                  <Download size={16} />{t('Instalar app')}
                </button>
              )}
              <button
                style={menuItemStyle}
                onClick={() => { toggleMode(); }}
              >
                {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {mode === 'dark' ? t('Ativar modo claro') : t('Ativar modo escuro')}
              </button>
              <button
                style={{ ...menuItemStyle, color: 'var(--danger)' }}
                onClick={() => { setMenuOpen(false); logout(); }}
              >
                <LogOut size={16} />{t('Sair')}
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
        <ConversationSidebar
          variant="mobile"
          conversations={m.conversations}
          filtered={m.filtered}
          selectedId={m.selectedId}
          search={m.search}
          chatFilter={m.chatFilter}
          sortBy={m.sortBy}
          loadingConversations={m.loadingConversations}
          hasMore={m.hasMoreConversations}
          loadingMore={m.loadingMoreConversations}
          onSearchChange={m.setSearch}
          onChatFilterChange={m.setChatFilter}
          onSortChange={m.setSortBy}
          onLoadMore={m.loadMoreConversations}
          onSelectConversation={m.handleSelectConv}
          onMarkUnread={m.handleMarkUnread}
          onTogglePin={m.handleTogglePin}
          onAiClick={m.handleAiIconClick}
        />

        <button
          className="m-fab"
          onClick={() => m.setShowNewConvModal(true)}
          title={t('Nova Conversa')}
          aria-label={t('Nova Conversa')}
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};
