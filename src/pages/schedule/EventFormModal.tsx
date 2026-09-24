import React from 'react';
import { Plus, X } from 'lucide-react';
import type { CalendarEventType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

export interface EventFormState {
  title: string;
  customer: string;
  technician: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
}

interface EventFormModalProps {
  form: EventFormState;
  onChange: (patch: Partial<EventFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({ form, onChange, onClose, onSave }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{t('Novo Evento')}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t('Título')} *</label>
            <input className="input" value={form.title} onChange={e => onChange({ title: e.target.value })} placeholder="Ex: Diagnóstico iPhone" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Tipo')}</label>
              <select className="select" value={form.type} onChange={e => onChange({ type: e.target.value as CalendarEventType })}>
                <option value="os">{t('OS')}</option>
                <option value="delivery">{t('Entrega')}</option>
                <option value="meeting">{t('Reunião')}</option>
                <option value="reminder">{t('Lembrete')}</option>
                <option value="other">{t('Outro')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Técnico')}</label>
              <input className="input" value={form.technician} onChange={e => onChange({ technician: e.target.value })} placeholder="Nome do técnico" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Data')}</label>
              <input className="input" type="date" value={form.date} onChange={e => onChange({ date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Início')}</label>
              <input className="input" type="time" value={form.startTime} onChange={e => onChange({ startTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Fim')}</label>
              <input className="input" type="time" value={form.endTime} onChange={e => onChange({ endTime: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Cliente')}</label>
            <input className="input" value={form.customer} onChange={e => onChange({ customer: e.target.value })} placeholder="Nome do cliente" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('Cancelar')}</button>
          <button className="btn btn-primary" onClick={onSave}><Plus size={15} />{t('Salvar')}</button>
        </div>
      </div>
    </div>
  );
};
