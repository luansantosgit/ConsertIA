import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, CheckCircle2, Pencil, Trash2, Search, Calendar } from 'lucide-react';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ChatReminderRepository, type ChatReminder } from '@/repositories/chat-reminder.repository';
import { ChatReminderModal, type ReminderDraft } from '@/pages/attendance/ChatReminderModal';

const repo = new ChatReminderRepository();

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type PeriodPreset = 'today' | 'week' | 'month' | 'all';

const PERIODS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'all', label: 'Todos' },
];

// Aba "Lembretes Agendados" da Agenda: nome do lead, busca,
// filtro por período (padrão hoje), editar e remover.
export const ChatRemindersTab: React.FC = () => {
  const [reminders, setReminders] = useState<ChatReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChatReminder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodPreset>('today');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayEnd = todayStart + 86400000;
    const weekStart = todayStart - now.getDay() * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    return reminders.filter(r => {
      if (q && !r.contact_phone.toLowerCase().includes(q) && !r.message.toLowerCase().includes(q)) return false;
      const ts = new Date(r.scheduled_at).getTime();
      switch (period) {
        case 'today': return ts >= todayStart && ts < dayEnd;
        case 'week': return ts >= weekStart && ts < weekStart + 7 * 86400000;
        case 'month': return ts >= monthStart && ts < monthEnd;
        case 'all': return true;
      }
    });
  }, [reminders, search, period]);

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar: busca + filtro de período */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder="Buscar por lead, telefone ou mensagem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`btn btn-sm btn-pill ${period === p.key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card card-p">
          <EmptyState
            title={search ? 'Nenhum lembrete encontrado' : 'Nenhum lembrete neste período'}
            description={search
              ? 'Tente buscar por outro termo.'
              : 'Use o botão de sino no chat para criar lembretes automáticos.'}
          />
        </div>
      ) : (
        filtered.map(rem => {
          const isSent = rem.status === 'sent';
          return (
            <div
              key={rem.id}
              className="card card-p"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isSent ? 0.65 : 1,
                borderLeft: `3px solid ${isSent ? '#16a34a' : 'var(--primary)'}`,
                padding: '10px 16px',
              }}
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
                <p style={{ fontWeight: 700, fontSize: '0.8125rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {rem.contact_phone}
                  <span className={`badge ${isSent ? 'badge-success' : rem.status === 'cancelled' ? 'badge-gray' : 'badge-warning'}`}
                    style={{ fontSize: '0.5625rem' }}>
                    {isSent ? 'Enviado' : rem.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={10} />
                  {fmt(rem.scheduled_at)}
                  {rem.sent_at ? ` · enviado em ${fmt(rem.sent_at)}` : ''}
                </p>
                <p style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rem.message}
                </p>
              </div>

              {!isSent && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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
