import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import EmptyState from '@/components/EmptyState';
import type { CalendarEvent } from '@/types';
import { todayLocalStr } from './dashboard.utils';

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function formatWhen(date: string, startTime: string, todayLabel: string): string {
  const time = (startTime ?? '').slice(0, 5);
  if (date === todayLocalStr()) return `${todayLabel}, ${time}`;
  const [y, m, d] = (date ?? '').split('-');
  if (!y || !m || !d) return date;
  return `${d}/${m} · ${time}`;
}

export const RecentAppointments: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="card card-p">
      <div className="card-header">
        <h3 className="card-title">{t('Últimos Agendamentos')}</h3>
        <button className="card-link" onClick={() => navigate('/agenda')}>
          {t('Ver todos')} →
        </button>
      </div>

      {events.length === 0 && <EmptyState icon={CalendarClock} title={t('Nenhum agendamento encontrado')} />}

      <div>
        {events.map((e) => {
          const name = e.customer || e.title || '—';
          return (
            <div key={e.id} className="dash-appt-item">
              <div className="dash-appt-avatar">{initials(name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="dash-appt-name">{name}</p>
                <p className="dash-appt-time">{e.title && e.customer ? e.title : ''}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="dash-appt-time" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatWhen(e.date, e.start_time, t('Hoje'))}
                </p>
                <span className="badge badge-info">{t('Agendado')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
