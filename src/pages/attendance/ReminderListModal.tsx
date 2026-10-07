import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ChatReminderRepository, type ChatReminder } from '@/repositories/chat-reminder.repository';
import { ChatReminderModal, type ReminderDraft } from './ChatReminderModal';
import type { ConvRow } from './types';

const repo = new ChatReminderRepository();

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Modal com a lista de lembretes agendados para ESTE contato,
// com editar e remover. Abre pelo dropdown do sino no chat.
export const ReminderListModal: React.FC<{
  open: boolean;
  conversation: ConvRow | null;
  onClose: () => void;
}> = ({ open, conversation, onClose }) => {
  const [reminders, setReminders] = useState<ChatReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ChatReminder | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversation?.id) return;
    setLoading(true);
    try {
      setReminders(await repo.getByConversation(conversation.id));
    } finally {
      setLoading(false);
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open || !conversation) return null;

  const saveEdit = async (draft: ReminderDraft) => {
    if (!draft.id) return;
    await repo.update(draft.id, { message: draft.message, scheduled_at: draft.scheduledAt, status: 'pending' });
    await load();
  };

  const remove = async () => {
    if (!deleteId) return;
    await repo.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
          <div className="modal-header">
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="var(--primary)" />
              Lembretes de {conversation.contactName}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
            ) : reminders.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 16 }}>
                Nenhum lembrete agendado para este contato.
              </p>
            ) : (
              reminders.map(rem => {
                const isSent = rem.status === 'sent';
                return (
                  <div key={rem.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: 10, borderRadius: 10,
                    border: `1px solid ${isSent ? '#bbf7d0' : 'var(--border)'}`,
                    background: isSent ? '#f0fdf4' : 'var(--bg-secondary, #f8fafc)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSent ? '#ecfdf5' : 'var(--primary-light)',
                      color: isSent ? '#16a34a' : 'var(--primary)',
                    }}>
                      {isSent ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {fmt(rem.scheduled_at)}
                        <span className={`badge ${isSent ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.5rem' }}>
                          {isSent ? 'Enviado' : 'Pendente'}
                        </span>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0', whiteSpace: 'pre-wrap' }}>
                        {rem.message}
                      </p>
                    </div>
                    {!isSent && (
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditing(rem); setEditOpen(true); }}
                          title="Editar"
                          style={{ padding: 4 }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteId(rem.id)}
                          title="Remover"
                          style={{ padding: 4, color: 'var(--danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {editing && (
        <ChatReminderModal
          open={editOpen}
          conversation={conversation}
          editing={{
            id: editing.id,
            message: editing.message,
            scheduledAt: editing.scheduled_at,
          }}
          onClose={() => { setEditOpen(false); setEditing(null); }}
          onSave={saveEdit}
          onDelete={async id => { await repo.delete(id); await load(); }}
        />
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Remover lembrete"
        message="Tem certeza? O lembrete não será enviado."
        variant="danger"
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
};
