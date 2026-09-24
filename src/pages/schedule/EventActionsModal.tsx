import React, { useState } from 'react';
import { X, CalendarCheck, CalendarX, UserCheck, UserX, CalendarClock } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppointmentStatus } from '@/types';
import { STATUS_BADGES, STATUS_LABELS } from './eventStatus';

export interface AppointmentTarget {
  id: string;
  title: string;
  customer: string;
  date: string;
  startTime: string;
  status?: AppointmentStatus;
}

interface EventActionsModalProps {
  event: AppointmentTarget;
  onClose: () => void;
  onUpdateStatus: (eventId: string, status: AppointmentStatus) => Promise<void>;
  onReschedule: (eventId: string, date: string, startTime: string) => Promise<void>;
}

export const EventActionsModal: React.FC<EventActionsModalProps> = ({ event, onClose, onUpdateStatus, onReschedule }) => {
  const { t } = useTranslation();
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(event.date);
  const [newTime, setNewTime] = useState(event.startTime);
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      onClose();
    } catch (err) {
      console.error('Appointment action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = event.status ? (
    <span className={STATUS_BADGES[event.status]}>{t(STATUS_LABELS[event.status])}</span>
  ) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{event.title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <CalendarClock size={15} />
            {event.date.split('-').reverse().join('/')} · {event.startTime}
            {event.customer ? ` · ${event.customer}` : ''}
          </div>
          {statusBadge}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" disabled={loading || event.status === 'confirmed'} onClick={() => run(() => onUpdateStatus(event.id, 'confirmed'))}>
              <CalendarCheck size={14} />{t('Confirmar')}
            </button>
            <button className="btn btn-danger btn-sm" disabled={loading} onClick={() => setShowCancel(true)}>
              <CalendarX size={14} />{t('Cancelar')}
            </button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => run(() => onUpdateStatus(event.id, 'completed'))}>
              <UserCheck size={14} />{t('Compareceu')}
            </button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => run(() => onUpdateStatus(event.id, 'no_show'))}>
              <UserX size={14} />{t('Não compareceu')}
            </button>
          </div>

          {!showReschedule ? (
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => setShowReschedule(true)}>
              <CalendarClock size={14} />{t('Remarcar')}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Nova data')}</label>
                  <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Novo horário')}</label>
                  <input className="input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" disabled={loading || !newDate || !newTime} onClick={() => run(() => onReschedule(event.id, newDate, newTime))}>
                {t('Salvar')}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={async () => { setShowCancel(false); await run(() => onUpdateStatus(event.id, 'cancelled')); }}
        title={t('Cancelar agendamento')}
        message={t('Tem certeza que deseja cancelar este agendamento?')}
        confirmLabel={t('Cancelar')}
        variant="danger"
      />
    </div>
  );
};
