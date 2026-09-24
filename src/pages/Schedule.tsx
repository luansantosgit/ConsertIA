import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Wrench } from 'lucide-react';
import { CalendarEventRepository } from '@/repositories/calendar-event.repository';
import type { CalendarEvent, CalendarEventType, AppointmentStatus } from '@/types';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { useTranslation } from '@/hooks/useTranslation';
import { statusColor, STATUS_BADGES, STATUS_LABELS } from './schedule/eventStatus';
import { EventFormModal, type EventFormState } from './schedule/EventFormModal';
import { EventActionsModal, type AppointmentTarget } from './schedule/EventActionsModal';

const EVENT_COLORS: Record<string, string> = {
  os: '#4f46e5',
  delivery: '#10b981',
  meeting: '#f59e0b',
  reminder: '#10b981',
  other: '#6b7280',
};

interface CalEvent {
  id: string;
  title: string;
  customer: string;
  technician: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  color: string;
  status?: AppointmentStatus;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY = new Date();
const todayStr = localDateStr(TODAY);

function toCalEvent(ev: CalendarEvent): CalEvent {
  return {
    id: ev.id,
    title: ev.title,
    customer: ev.customer || '',
    technician: ev.technician || '',
    date: ev.date,
    startTime: (ev.start_time || '09:00').slice(0, 5),
    endTime: (ev.end_time || '10:00').slice(0, 5),
    type: ev.type,
    color: ev.color || EVENT_COLORS[ev.type] || '#6b7280',
    status: ev.status,
  };
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(base: Date) {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - day + 1);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export const Schedule: React.FC = () => {
  const { t, language } = useTranslation();
  const repository = useMemo(() => new CalendarEventRepository(), []);
  const [currentWeek, setCurrentWeek] = useState(TODAY);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<AppointmentTarget | null>(null);
  const [form, setForm] = useState<EventFormState>({ title: '', customer: '', technician: '', date: todayStr, startTime: '09:00', endTime: '10:00', type: 'os' });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const days = getWeekDays(currentWeek);
      const weekStart = localDateStr(days[0]);
      const weekEnd = localDateStr(days[days.length - 1]);
      const data = await repository.getByDateRange(weekStart, weekEnd);
      setEvents(data.map(toCalEvent));
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [currentWeek, repository]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
  const monthLabel = weekDays[0].toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const eventsOnDay = (day: Date) => {
    const str = localDateStr(day);
    return events.filter(e => e.date === str);
  };

  const handleSave = async () => {
    if (!form.title) return;
    try {
      const newEvent = await repository.create({
        title: form.title,
        customer: form.customer,
        technician: form.technician,
        date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        type: form.type,
        color: EVENT_COLORS[form.type] || '#6b7280',
        all_day: false,
      });
      setEvents(prev => [...prev, toCalEvent(newEvent)]);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleUpdateStatus = async (eventId: string, status: AppointmentStatus) => {
    await repository.update(eventId, { status });
    await fetchEvents();
  };

  const handleReschedule = async (eventId: string, date: string, startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const endMin = ((h * 60 + m + 60) % 1440);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    await repository.update(eventId, { date, start_time: startTime, end_time: endTime, status: 'rescheduled' });
    await fetchEvents();
  };

  const openActions = (ev: CalEvent) => {
    setSelected({ id: ev.id, title: ev.title, customer: ev.customer, date: ev.date, startTime: ev.startTime, status: ev.status });
  };

  const todayEvents = eventsOnDay(TODAY);

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchEvents(); }} />}
      {!error && loading && <SkeletonCard />}
      {!error && !loading && (
      <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); }}><ChevronLeft size={16} /></button>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{monthLabel}</h3>
          <button className="btn btn-secondary btn-icon" onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); }}><ChevronRight size={16} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentWeek(TODAY)}>{t('Hoje')}</button>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {[['OS', '#4f46e5'], [t('Reunião'), '#f59e0b'], [t('Entrega'), '#10b981']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />{l}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid var(--border)' }}>
          <div />
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === TODAY.toDateString();
            return (
              <div key={i} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{t(DAYS[day.getDay()])}</p>
                <div style={{ width: 32, height: 32, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9375rem', background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? '#fff' : 'var(--text-primary)' }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {HOURS.map(hour => (
          <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid #f5f6fb', minHeight: 60 }}>
            <div style={{ padding: '8px 12px 0', fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map((day, i) => {
              const dayEvents = eventsOnDay(day).filter(e => parseInt(e.startTime) === hour);
              return (
                <div key={i} style={{ borderLeft: '1px solid var(--border)', padding: '4px 4px', position: 'relative', minHeight: 60 }}>
                  {dayEvents.map(ev => {
                    const c = statusColor(ev.status, ev.color);
                    return (
                      <div key={ev.id} onClick={() => openActions(ev)} style={{
                        background: c + '15', border: `1px solid ${c}40`, borderLeft: `3px solid ${c}`,
                        borderRadius: 6, padding: '5px 8px', marginBottom: 3, cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 8px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                      >
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: c, marginBottom: 1 }}>{ev.startTime} – {ev.endTime}</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        {ev.customer && <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{ev.customer}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card card-p">
        <div className="card-header">
          <h3 className="card-title">{t('Eventos de Hoje')}</h3>
          <span className="badge badge-primary">{todayEvents.length} {t('agendados')}</span>
        </div>
        {todayEvents.length === 0 ? (
          <EmptyState icon={Calendar} title={t('Nenhum evento agendado para hoje')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayEvents.map(ev => {
              const c = statusColor(ev.status, ev.color);
              return (
                <div key={ev.id} onClick={() => openActions(ev)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: c + '10', border: `1px solid ${c}30`, cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wrench size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ev.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{ev.startTime} – {ev.endTime}
                      {ev.customer && <> · <User size={10} style={{ display: 'inline', marginLeft: 6, marginRight: 3 }} />{ev.customer}</>}
                    </p>
                  </div>
                  {ev.status && <span className={STATUS_BADGES[ev.status]}>{t(STATUS_LABELS[ev.status])}</span>}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c }}>{ev.technician}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <EventFormModal
          form={form}
          onChange={patch => setForm(f => ({ ...f, ...patch }))}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {selected && (
        <EventActionsModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={handleUpdateStatus}
          onReschedule={handleReschedule}
        />
      )}
      </>
      )}
    </div>
  );
};
