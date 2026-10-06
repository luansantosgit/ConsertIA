import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, Clock, Pencil, Trash2 } from 'lucide-react';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ChatReminderRepository, type ChatReminder } from '@/repositories/chat-reminder.repository';
import { ChatReminderModal, type ReminderDraft } from '@/pages/attendance/ChatReminderModal';

const repo = new ChatReminderRepository();

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Aba "Lembretes Agendados" da página Agenda: lista lembretes do chat
// com status, editar e remover.
export const ChatRemindersTab: React.FC = () => {
  const [reminders, setReminders] = useState<ChatReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChatReminder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReminders(await repo.getAll());
    } catch {
      setError('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async (draft: ReminderDraft) => {
    if (!draft.id) return;
    await repo.update(draft.id, {
      message: draft.message,
      scheduled_at: draft.scheduledAt,
      status: 'pending',
    });
    await load();
  };

  const remove = async () => {
    if (!deleteId) return;
    await repo.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reminders.length === 0 ? (
        <div className="card card-p">
          <EmptyState
            title="Nenhum lembrete agendado"
            description="Use o botão de sino no chat para criar lembretes automáticos que serão enviados ao cliente na data marcada."
          />
        </div>
      ) : (
        reminders.map(rem => {
          const isSent = rem.status === 'sent';
          const expanded = expandedId === rem.id;
          return (
            <div
              key={rem.id}
              className="card card-p"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isSent ? 0.65 : 1,
                borderLeft: `3px solid ${isSent ? '#16a34a' : 'var(--primary)'}`,
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expanded ? null : rem.id)}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isSent ? '#ecfdf5' : 'var(--primary-light)',
                color: isSent ? '#16a34a' : 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSent ? <CheckCircle2 size={17} /> : <Bell size={17} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} color="var(--text-muted)" />
                  {fmt(rem.scheduled_at)}
                  <span className={`badge ${isSent ? 'badge-success' : rem.status === 'cancelled' ? 'badge-gray' : 'badge-warning'}`}
                    style={{ fontSize: '0.5625rem' }}>
                    {isSent ? 'Enviado' : rem.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                </p>
                <p style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0',
                  overflow: expanded ? 'visible' : 'hidden',
                  textOverflow: expanded ? 'unset' : 'ellipsis',
                  whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
                }}>
                  {rem.message}
                </p>
                {expanded && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Para: {rem.contact_phone}
                    {rem.sent_at ? ` · enviado em ${fmt(rem.sent_at)}` : ''}
                  </p>
                )}
              </div>

              {expanded && !isSent && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditing(rem); setModalOpen(true); }}
                    title="Editar lembrete"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDeleteId(rem.id)}
                    style={{ color: 'var(--danger)' }}
                    title="Remover lembrete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {editing && (
        <ChatReminderModal
          open={modalOpen}
          conversation={{
            id: editing.conversation_id,
            contactName: editing.contact_phone,
            contact_phone: editing.contact_phone,
          } as never}
          editing={{
            id: editing.id,
            message: editing.message,
            scheduledAt: editing.scheduled_at,
          }}
          onClose={() => { setModalOpen(false); setEditing(null); }}
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
    </div>
  );
};
