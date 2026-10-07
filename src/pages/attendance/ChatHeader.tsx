import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileText, PanelRightClose, PanelRightOpen, Search, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { ConvRow } from './types';

interface ChatHeaderProps {
  selected: ConvRow | undefined;
  isRightPanelOpen: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onOpenOSModal: () => void;
  onOpenReminderModal: () => void;
  onOpenReminderList: () => void;
  onToggleRightPanel: () => void;
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
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const avatarUrl = selected?.contactAvatar || selected?.contact_avatar;
  const showAvatar = !!avatarUrl && !imgError;
  const tenantId = useAuthStore.getState().user?.tenantId;

  React.useEffect(() => {
    setImgError(false);
  }, [selected?.id, avatarUrl]);

  // Badge: lembretes pendentes para este contato
  React.useEffect(() => {
    if (!selected?.id || !tenantId) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('chat_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', selected.id)
        .eq('status', 'pending');
      setPendingCount(count ?? 0);
    };
    fetch();
  }, [selected?.id, tenantId]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: showAvatar ? 'transparent' : 'var(--primary-light)',
          color: 'var(--primary)',
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
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selected?.contactName}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selected?.contact_phone} · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selected?.deviceInfo}</span>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Sino de lembretes com badge e dropdown */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setBellOpen(v => !v)}
            title="Lembretes"
            style={{ borderRadius: 8, width: 34, height: 34, position: 'relative' }}
          >
            <Bell size={15} />
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                minWidth: 14, height: 14, padding: '0 3px', borderRadius: 999,
                background: 'var(--danger)', color: '#fff',
                fontSize: '0.5625rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, border: '1.5px solid #fff',
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
          {bellOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100,
              minWidth: 180, overflow: 'hidden', animation: 'slideUp 0.15s ease',
            }}>
              <button
                onClick={() => { setBellOpen(false); onOpenReminderList(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 14px', border: 'none',
                  cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
                  textAlign: 'left', background: 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <CheckCircle2 size={14} color="var(--primary)" />
                Ver agendamentos {pendingCount > 0 ? `(${pendingCount})` : ''}
              </button>
              <button
                onClick={() => { setBellOpen(false); onOpenReminderModal(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 14px', border: 'none',
                  cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
                  textAlign: 'left', background: 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus size={14} color="var(--primary)" />
                Fazer novo agendamento
              </button>
            </div>
          )}
        </div>

        <button
          className={searchOpen ? 'btn btn-primary btn-icon' : 'btn btn-secondary btn-icon'}
          onClick={onToggleSearch}
          title={searchOpen ? 'Fechar busca' : 'Buscar na conversa'}
          style={{ borderRadius: 8, width: 34, height: 34 }}
        >
          <Search size={15} />
        </button>
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
