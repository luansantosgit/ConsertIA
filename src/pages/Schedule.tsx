import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User, X, Wrench } from 'lucide-react';
import { CalendarEventRepository } from '@/repositories/calendar-event.repository';
import type { CalendarEvent, CalendarEventType } from '@/types';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { useTranslation } from '@/hooks/useTranslation';

const EVENT_COLORS: Record<string, string> = {
  os:       '#4f46e5',
  delivery: '#10b981',
  meeting:  '#f59e0b',
  reminder: '#10b981',
  other:    '#6b7280',
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

const repository = new CalendarEventRepository();

export const Schedule: React.FC = () => {
  const { t, language } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(TODAY);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', customer: '', technician: '', date: todayStr, startTime: '09:00', endTime: '10:00', type: 'os' as CalendarEventType });
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
  }, [currentWeek]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); };
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); };

  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
  const monthLabel = weekDays[0].toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const eventsOnDay = (day: Date) => {
    const str = localDateStr(day);
    return events.filter(e => e.date === str);
  };

  const handleSave = async () => {
    if (!form.title) return;
    try {
      const input: Partial<CalendarEvent> = {
        title: form.title,
        customer: form.customer,
        technician: form.technician,
        date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        type: form.type,
        color: EVENT_COLORS[form.type] || '#6b7280',
        all_day: false,
      };
      const newEvent = await repository.create(input);
      setEvents(prev => [...prev, toCalEvent(newEvent)]);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchEvents(); }} />}
      {!error && loading && (
        <SkeletonCard />
      )}
      {!error && !loading && (
      <>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={prevWeek}><ChevronLeft size={16} /></button>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{monthLabel}</h3>
          <button className="btn btn-secondary btn-icon" onClick={nextWeek}><ChevronRight size={16} /></button>
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

      {/* Calendar grid */}
      <div className="card" style={{ overflow: 'auto' }}>
          <>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid var(--border)' }}>
              <div />
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === TODAY.toDateString();
                return (
                  <div key={i} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{t(DAYS[day.getDay()])}</p>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', margin: '0 auto',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.9375rem',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? '#fff' : 'var(--text-primary)',
                    }}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid #f5f6fb', minHeight: 60 }}>
                <div style={{ padding: '8px 12px 0', fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, i) => {
                  const dayEvents = eventsOnDay(day).filter(e => parseInt(e.startTime) === hour);
                  return (
                    <div key={i} style={{ borderLeft: '1px solid var(--border)', padding: '4px 4px', position: 'relative', minHeight: 60 }}>
                      {dayEvents.map(ev => (
                        <div key={ev.id} style={{
                          background: ev.color + '15', border: `1px solid ${ev.color}40`,
                          borderLeft: `3px solid ${ev.color}`, borderRadius: 6,
                          padding: '5px 8px', marginBottom: 3, cursor: 'pointer',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 8px rgba(0,0,0,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        >
                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: ev.color, marginBottom: 1 }}>{ev.startTime} – {ev.endTime}</p>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                          {ev.customer && <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{ev.customer}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
      </div>

      {/* Today's events list */}
      <div className="card card-p">
        <div className="card-header">
          <h3 className="card-title">{t('Eventos de Hoje')}</h3>
          <span className="badge badge-primary">{eventsOnDay(TODAY).length} {t('agendados')}</span>
        </div>
        {eventsOnDay(TODAY).length === 0 ? (
          <EmptyState icon={Calendar} title={t('Nenhum evento agendado para hoje')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eventsOnDay(TODAY).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: ev.color + '10', border: `1px solid ${ev.color}30` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wrench size={16} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ev.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{ev.startTime} – {ev.endTime}
                    {ev.customer && <> · <User size={10} style={{ display: 'inline', marginLeft: 6, marginRight: 3 }} />{ev.customer}</>}
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ev.color, background: ev.color + '15', padding: '3px 10px', borderRadius: 99 }}>{ev.technician}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Novo Evento')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('Título')} *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Diagnóstico iPhone" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Tipo')}</label>
                  <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEventType }))}>
                    <option value="os">{t('OS')}</option>
                    <option value="delivery">{t('Entrega')}</option>
                    <option value="meeting">{t('Reunião')}</option>
                    <option value="reminder">{t('Lembrete')}</option>
                    <option value="other">{t('Outro')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Técnico')}</label>
                  <input
                    className="input"
                    value={form.technician}
                    onChange={e => setForm(f => ({ ...f, technician: e.target.value }))}
                    placeholder="Nome do técnico"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Data')}</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Início')}</label>
                  <input className="input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Fim')}</label>
                  <input className="input" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Cliente')}</label>
                <input className="input" value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} placeholder="Nome do cliente" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('Cancelar')}</button>
              <button className="btn btn-primary" onClick={handleSave}><Plus size={15} />{t('Salvar')}</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
