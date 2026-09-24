import React, { useEffect, useState, useCallback } from 'react';
import { Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';
import type { BusinessHourDay, BusinessHours } from '@/types';

const DAYS = [
  { key: '0', label: 'Domingo' },
  { key: '1', label: 'Segunda-feira' },
  { key: '2', label: 'Terça-feira' },
  { key: '3', label: 'Quarta-feira' },
  { key: '4', label: 'Quinta-feira' },
  { key: '5', label: 'Sexta-feira' },
  { key: '6', label: 'Sábado' },
];

const DEFAULT_HOURS: BusinessHours = {
  '0': { open: false, start: '08:00', end: '18:00' },
  '1': { open: true, start: '08:00', end: '18:00' },
  '2': { open: true, start: '08:00', end: '18:00' },
  '3': { open: true, start: '08:00', end: '18:00' },
  '4': { open: true, start: '08:00', end: '18:00' },
  '5': { open: true, start: '08:00', end: '18:00' },
  '6': { open: true, start: '08:00', end: '12:00' },
};

function normalize(raw: unknown): BusinessHours {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_HOURS };
  return DAYS.reduce((acc, { key }) => {
    const entry = (raw as BusinessHours)[key];
    const fallback = DEFAULT_HOURS[key];
    acc[key] = entry ? { open: entry.open === true, start: entry.start || fallback.start, end: entry.end || fallback.end } : fallback;
    return acc;
  }, {} as BusinessHours);
}

export const BusinessHoursSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('tenant_settings')
          .select('business_hours')
          .eq('tenant_id', user?.tenantId ?? '')
          .maybeSingle();
        setHours(normalize(data?.business_hours));
      } catch (err) {
        console.error('Failed to load business hours:', err);
        setError('Erro ao carregar horário de atendimento');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.tenantId]);

  const updateDay = useCallback((key: string, patch: Partial<BusinessHourDay>) => {
    setHours(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
        const { error: upsertError } = await supabase
          .from('tenant_settings')
          .update({ business_hours: hours })
          .eq('tenant_id', user?.tenantId ?? '');
      if (upsertError) throw upsertError;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save business hours:', err);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorMessage message={error} onRetry={() => setError(null)} />;
  if (loading) return <SkeletonCard />;

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} />{t('Horário de Atendimento')}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Defina os dias e horários em que a empresa atende. O agente de IA usa essas informações para agendar e informar se a empresa está aberta ou fechada.')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={day.open}
                  style={{ opacity: 0, width: 0, height: 0 }}
                  onChange={() => updateDay(key, { open: !day.open })}
                />
                <span style={{ position: 'absolute', inset: 0, background: day.open ? 'var(--primary)' : '#cbd5e1', borderRadius: 11, transition: '0.3s' }}>
                  <span style={{ position: 'absolute', top: 3, left: day.open ? 21 : 3, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
              <span style={{ flex: 1, minWidth: 130, fontWeight: 600, fontSize: '0.875rem', color: day.open ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {t(label)}
              </span>
              {day.open ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="input"
                    type="time"
                    value={day.start}
                    onChange={e => updateDay(key, { start: e.target.value })}
                    style={{ width: 110 }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{t('às')}</span>
                  <input
                    className="input"
                    type="time"
                    value={day.end}
                    onChange={e => updateDay(key, { end: e.target.value })}
                    style={{ width: 110 }}
                  />
                </div>
              ) : (
                <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{t('Fechado')}</span>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? <><Check size={15} />{t('Salvo!')}</> : saving ? t('Salvando...') : t('Salvar horários')}
        </button>
      </div>
    </div>
  );
};
