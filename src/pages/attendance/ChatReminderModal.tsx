import React, { useState, useEffect } from 'react';
import { X, Bell, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { ConvRow } from './types';

export interface ReminderDraft {
  id?: string;
  message: string;
  scheduledAt: string; // ISO datetime
}

// Modal de criação/edição de lembrete automático do chat.
// O sistema envia a mensagem ao lead automaticamente na data/hora marcada.
export const ChatReminderModal: React.FC<{
  open: boolean;
  conversation: ConvRow | null;
  editing: ReminderDraft | null;
  onClose: () => void;
  onSave: (draft: ReminderDraft) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ open, conversation, editing, onClose, onSave, onDelete }) => {
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setMessage(editing.message);
      const dt = new Date(editing.scheduledAt);
      setDate(dt.toISOString().slice(0, 10));
      setTime(dt.toISOString().slice(11, 16));
    } else {
      setMessage('');
      const now = new Date(Date.now() + 30 * 60_000);
      setDate(now.toISOString().slice(0, 10));
      setTime(now.toISOString().slice(11, 16));
    }
  }, [open, editing]);

  if (!open || !conversation) return null;

  const submit = async () => {
    if (!message.trim() || !date || !time) {
      setError('Preencha a mensagem, data e hora.');
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      setError('A data/hora deve ser no futuro.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: editing?.id,
        message: message.trim(),
        scheduledAt,
      });
      onClose();
    } catch {
      setError('Erro ao salvar lembrete.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(editing.id);
      onClose();
    } catch {
      setError('Erro ao remover lembrete.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="var(--primary)" />
              {editing ? 'Editar lembrete' : 'Novo lembrete'}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 10 }}>
              <p style={{ fontWeight: 700, fontSize: '0.8125rem', margin: 0 }}>{conversation.contactName}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {conversation.contact_phone}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Mensagem que será enviada *</label>
              <textarea
                className="input"
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Olá! Passando para lembrar do orçamento aprovado..."
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 0 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora *</label>
                <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 0 }} />
              </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            {editing?.id && onDelete && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                style={{ marginRight: 'auto', gap: 4 }}
              >
                <Trash2 size={13} /> Remover
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving || !message.trim()}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Agendar lembrete'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Remover lembrete"
        message="Tem certeza? O lembrete não será enviado."
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
};
