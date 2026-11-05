import React, { useState, useEffect, useRef } from 'react';
import { FileText, PanelRightClose, PanelRightOpen, Search, MoreVertical, ChevronLeft, UserRound } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ConvRow } from './types';
import { ChatBellMenu } from './ChatBellMenu';

interface ChatHeaderProps {
  selected: ConvRow | undefined;
  isRightPanelOpen: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onOpenOSModal: () => void;
  onOpenReminderModal: () => void;
  onOpenReminderList: () => void;
  onToggleRightPanel: () => void;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selected,
  isRightPanelOpen,
  searchOpen,
  onToggleSearch,
  onOpenOSModal,
  onOpenReminderModal,
  onOpenReminderList,
  onToggleRightPanel,
  onBack,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [imgError, setImgError] = React.useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = selected?.contactAvatar || selected?.contact_avatar;
  const showAvatar = !!avatarUrl && !imgError;

  React.useEffect(() => {
    setImgError(false);
  }, [selected?.id, avatarUrl]);

  // Fecha o menu mobile ao clicar fora
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

  const avatar = (
    <div style={{
      width: isMobile ? 34 : 38, height: isMobile ? 34 : 38, borderRadius: '50%',
      background: showAvatar ? 'transparent' : 'var(--primary-light)',
      color: 'var(--primary-text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '0.9375rem', overflow: 'hidden', flexShrink: 0,
    }}>
      {showAvatar ? (
        <img key={avatarUrl} src={avatarUrl} alt={selected?.contactName || ''} onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        selected?.contactName?.charAt(0) || '?'
      )}
    </div>
  );

  const identity = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        fontWeight: 700, fontSize: isMobile ? '0.9375rem' : '0.9375rem',
        color: 'var(--text-primary)', margin: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{selected?.contactName}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
        {selected?.contact_phone} · <span style={{ color: 'var(--primary-text)', fontWeight: 600 }}>{selected?.deviceInfo}</span>
      </p>
    </div>
  );

  const searchBtn = (
    <button
      className={searchOpen ? 'btn btn-primary btn-icon' : 'btn btn-secondary btn-icon'}
      onClick={onToggleSearch}
      title={searchOpen ? t('Fechar busca') : t('Buscar na conversa')}
      aria-label={t('Buscar na conversa')}
      style={{ borderRadius: 8, width: 34, height: 34 }}
    >
      <Search size={15} />
    </button>
  );

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '10px 14px', border: 'none',
    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
    textAlign: 'left', background: 'transparent',
    color: 'var(--text-primary)', whiteSpace: 'nowrap',
  };

  /* ── Variante mobile: [← voltar][avatar][nome] [sino][busca][⋮ menu] ── */
  if (isMobile) {
    return (
      <div className="m-chat-header" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card-bg)',
        paddingTop: 'calc(10px + env(safe-area-inset-top))',
      }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          title={t('Voltar')}
          aria-label={t('Voltar')}
          style={{ width: 34, height: 34, flexShrink: 0 }}
        >
          <ChevronLeft size={22} />
        </button>
        {avatar}
        {identity}
        {selected && (
          <ChatBellMenu
            conversationId={selected.id}
            onOpenReminderList={onOpenReminderList}
            onOpenReminderModal={onOpenReminderModal}
          />
        )}
        {searchBtn}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setMenuOpen(v => !v)}
            title={t('Mais opções')}
            aria-label={t('Mais opções')}
            style={{ borderRadius: 8, width: 34, height: 34 }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100,
              minWidth: 200, overflow: 'hidden', animation: 'slideUp 0.15s ease',
            }}>
              <button onClick={() => { setMenuOpen(false); onOpenOSModal(); }} style={menuItemStyle}>
                <FileText size={14} />{t('Abrir OS')}
              </button>
              <button onClick={() => { setMenuOpen(false); onToggleRightPanel(); }} style={menuItemStyle}>
                <UserRound size={14} />{t('Detalhes do cliente')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Variante desktop (original) ── */
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--card-bg)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {avatar}
        {identity}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {selected && (
          <ChatBellMenu
            conversationId={selected.id}
            onOpenReminderList={onOpenReminderList}
            onOpenReminderModal={onOpenReminderModal}
          />
        )}
        {searchBtn}
        <button className="btn btn-primary btn-sm" onClick={onOpenOSModal}>
          <FileText size={13} />Abrir OS
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onToggleRightPanel}
          title={isRightPanelOpen ? 'Recolher detalhes do cliente' : 'Expandir detalhes do cliente'}
          style={{ borderRadius: 8, width: 34, height: 34 }}
        >
          {isRightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </div>
  );
};
