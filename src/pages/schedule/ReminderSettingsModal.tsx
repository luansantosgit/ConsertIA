import React, { useState } from 'react';
import { X, Bell, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import type { CalendarEventType } from '@/types';
const ALL_EVENT_TYPES: CalendarEventType[] = ['os', 'delivery', 'meeting', 'reminder', 'other'];

const TYPE_LABELS: Record<CalendarEventType, string> = {
  os: 'OS',
  delivery: 'Entrega',
  meeting: 'Reunião',
  reminder: 'Lembrete',
  other: 'Outro',
};

const HOUR_OPTIONS = [0, 1, 2, 4, 12, 24];

interface ReminderSettingsModalProps {
  hours: number;
  eventTypes: CalendarEventType[];
  durationMinutes: number;
  onClose: () => void;
  onSaved: (hours: number, eventTypes: CalendarEventType[], durationMinutes: number) => void;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({ hours, eventTypes, durationMinutes, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [leadHours, setLeadHours] = useState(hours);
  const [duration, setDuration] = useState(durationMinutes || 60);
  const [types, setTypes] = useState<CalendarEventType[]>(
    eventTypes.length > 0 ? eventTypes : [...ALL_EVENT_TYPES]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (type: CalendarEventType) => {
    setTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const active = types.length > 0 ? types : [...ALL_EVENT_TYPES];
      const { error: upsertError } = await supabase
        .from('tenant_settings')
        .update({
          schedule_confirmation_hours: leadHours || null,
          confirmation_event_types: active,
          appointment_duration_minutes: duration,
        })
        .eq('tenant_id', user?.tenantId ?? '');
      if (upsertError) throw upsertError;
      onSaved(leadHours, active, duration);
      onClose();
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={17} />{t('Lembretes de agendamento')}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{t('Quando enviar')}</label>
            <select className="select" value={leadHours} onChange={e => setLeadHours(Number(e.target.value))}>
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>
                  {h === 0 ? t('Desativado') : `${h} ${h === 1 ? t('hora antes') : t('horas antes')}`}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {t('O agente envia automaticamente uma mensagem confirmando se o cliente vai comparecer, antes do horário marcado.')}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">{t('Quais eventos disparam o lembrete')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
              {ALL_EVENT_TYPES.map(type => {
                const checked = types.includes(type);
                return (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleType(type)} />
                    {t(TYPE_LABELS[type])}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('Duração da janela de manutenção')}</label>
            <select
              className="select"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            >
              {[15, 30, 60, 90, 120].map(m => (
                <option key={m} value={m}>{m < 60 ? `${m} minutos` : m === 60 ? '1 hora' : `${m / 60} horas`}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {t('Tempo reservado na agenda para cada manutenção (a IA e a remarcação usam esta janela). Padrão: 1 hora.')}
            </p>
          </div>

          {error && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('Cancelar')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} />{saving ? t('Salvando...') : t('Salvar configurações')}
          </button>
        </div>
      </div>
    </div>
  );
};
