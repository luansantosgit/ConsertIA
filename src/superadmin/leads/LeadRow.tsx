import React, { useState } from 'react';
import { Phone, MessageSquareText, Trash2, ChevronUp, Save } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { LandingLead, LandingLeadStatus } from '@/types';

interface LeadRowProps {
  lead: LandingLead;
  onStatusChange: (id: string, status: LandingLeadStatus) => Promise<void>;
  onNotesSave: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_LABEL: Record<LandingLeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

const STATUS_CLASS: Record<LandingLeadStatus, string> = {
  novo: 'badge badge-primary',
  contatado: 'badge badge-secondary',
  convertido: 'badge badge-success',
  perdido: 'badge badge-danger',
};

export const LeadRow: React.FC<LeadRowProps> = ({ lead, onStatusChange, onNotesSave, onDelete }) => {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const date = new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleNotesSave = async () => {
    setSavingNotes(true);
    await onNotesSave(lead.id, notes);
    setSavingNotes(false);
    setNotesOpen(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(lead.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong style={{ fontSize: '0.875rem' }}>{lead.name}</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            {lead.store_name} · {date}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {lead.plan_name && <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>Plano: {lead.plan_name}</span>}
            {lead.quotes_per_day != null && <span>~{lead.quotes_per_day} orç./dia</span>}
            {lead.ticket != null && <span>ticket R$ {lead.ticket.toLocaleString('pt-BR')}</span>}
            <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {lead.whatsapp}
            </a>
          </div>
        </div>

        <span className={STATUS_CLASS[lead.status]}>{STATUS_LABEL[lead.status]}</span>

        <select
          className="select"
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LandingLeadStatus)}
          style={{ maxWidth: 130 }}
          aria-label="Status do lead"
        >
          {(Object.keys(STATUS_LABEL) as LandingLeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <a className="btn btn-secondary btn-sm" href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer">
          <Phone size={14} /> WhatsApp
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => setNotesOpen(v => !v)} aria-label="Notas">
          {notesOpen ? <ChevronUp size={14} /> : <MessageSquareText size={14} />}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)} aria-label="Excluir lead" style={{ color: 'var(--danger)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {notesOpen && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações do atendimento (ex: melhor horário, objeções, tamanho da loja...)"
            rows={2}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleNotesSave} disabled={savingNotes}>
            <Save size={14} /> {savingNotes ? 'Salvando...' : 'Salvar nota'}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Excluir lead"
        message={`Excluir o lead de ${lead.name} (${lead.store_name})? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
      />
    </div>
  );
};
