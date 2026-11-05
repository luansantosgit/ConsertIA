import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

interface ChatBellMenuProps {
  conversationId: string;
  onOpenReminderList: () => void;
  onOpenReminderModal: () => void;
}

/** Sino de lembretes do chat (badge de pendentes + dropdown), usado no header desktop e mobile. */
export const ChatBellMenu: React.FC<ChatBellMenuProps> = ({
  conversationId,
  onOpenReminderList,
  onOpenReminderModal,
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const tenantId = useAuthStore.getState().user?.tenantId;

  React.useEffect(() => {
    if (!conversationId || !tenantId) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('chat_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .eq('status', 'pending');
      setPendingCount(count ?? 0);
    };
    fetch();
  }, [conversationId, tenantId]);

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

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '10px 14px', border: 'none',
    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
    textAlign: 'left', background: 'transparent',
    color: 'var(--text-primary)',
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-icon"
        onClick={() => setBellOpen(v => !v)}
        title="Lembretes"
        aria-label="Lembretes"
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
            lineHeight: 1, border: '1.5px solid var(--card-bg)',
          }}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
      {bellOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100,
          minWidth: 180, overflow: 'hidden', animation: 'slideUp 0.15s ease',
        }}>
          <button
            onClick={() => { setBellOpen(false); onOpenReminderList(); }}
            style={itemStyle}
          >
            <CheckCircle2 size={14} color="var(--primary-text)" />
            Ver agendamentos {pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
          <button
            onClick={() => { setBellOpen(false); onOpenReminderModal(); }}
            style={itemStyle}
          >
            <Plus size={14} color="var(--primary-text)" />
            Fazer novo agendamento
          </button>
        </div>
      )}
    </div>
  );
};
