import React, { useState, useEffect, useCallback } from 'react';
import { Filter, RefreshCw, Users, TrendingUp } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { LeadRow } from './leads/LeadRow';
import { LandingLeadRepository } from '@/repositories/landing-lead.repository';
import type { LandingLead, LandingLeadStatus } from '@/types';

const repo = new LandingLeadRepository();

const STATUSES: { key: LandingLeadStatus | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'novo', label: 'Novos' },
  { key: 'contatado', label: 'Contatados' },
  { key: 'convertido', label: 'Convertidos' },
  { key: 'perdido', label: 'Perdidos' },
];

const StatCard: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent }) => (
  <div className="card card-p" style={{ padding: 16, flex: 1, minWidth: 140 }}>
    <span className="stat-card-label">{label}</span>
    <span className="stat-card-value" style={accent ? { color: accent } : undefined}>{value}</span>
  </div>
);

export const SuperAdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LandingLeadStatus | 'todos'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await repo.getAll();
      setLeads(all);
    } catch {
      setError('Não foi possível carregar os leads do site.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: LandingLeadStatus) => {
    const updated = await repo.setStatus(id, status);
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status: updated.status } : l)));
  };

  const handleNotesSave = async (id: string, notes: string) => {
    const updated = await repo.update(id, { notes });
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, notes: updated.notes } : l)));
  };

  const handleDelete = async (id: string) => {
    await repo.delete(id);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const count = (status: LandingLeadStatus) => leads.filter(l => l.status === status).length;
  const visible = filter === 'todos' ? leads : leads.filter(l => l.status === filter);
  const conversion = leads.length ? Math.round((count('convertido') / leads.length) * 100) : 0;

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 76, flex: 1, minWidth: 140 }} />)}
        </div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total de leads" value={leads.length} />
        <StatCard label="Novos" value={count('novo')} />
        <StatCard label="Convertidos" value={count('convertido')} accent="#16a34a" />
        <StatCard label="Taxa de conversão" value={`${conversion}%`} accent="var(--primary)" />
      </div>

      {error && (
        <div className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--danger)', fontSize: '0.875rem', flex: 1 }}>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /> Tentar novamente</button>
        </div>
      )}

      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-muted)" />
          {STATUSES.map(s => (
            <button
              key={s.key}
              className={`btn btn-sm btn-pill ${filter === s.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(s.key)}
            >
              {s.label} {s.key === 'todos' ? leads.length : count(s.key as LandingLeadStatus)}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <TrendingUp size={16} color="var(--text-muted)" />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum lead por aqui ainda"
            description="Assim que um visitante enviar o formulário do site, ele aparece aqui no funil."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
                onNotesSave={handleNotesSave}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
