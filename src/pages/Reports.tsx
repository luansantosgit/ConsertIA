import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Target, Zap, Download,
  ArrowUpRight, ArrowDownRight, Clock, Users, FileText, DollarSign
} from 'lucide-react';
import { ServiceOrderRepository } from '@/repositories/service-order.repository';
import { TransactionRepository } from '@/repositories/transaction.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import type { ServiceOrder, Transaction, Lead } from '@/types';
import { SkeletonStats, SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { useTranslation } from '@/hooks/useTranslation';

const MiniBar: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0',
            height: `${(v / max) * 100}%`,
            background: i === data.length - 2 ? color : color + '35',
            transition: 'height 0.4s ease',
          }} />
        </div>
      ))}
    </div>
  );
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];

function formatCurrency(value: number): string {
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthFromDate(dateStr: string): number {
  return new Date(dateStr).getMonth();
}

function calculateAvgRepairTime(orders: ServiceOrder[]): string {
  const completed = orders.filter(o => o.completed_at && o.created_at);
  if (completed.length === 0) return '0d';
  const totalDays = completed.reduce((sum, o) => {
    const start = new Date(o.created_at).getTime();
    const end = new Date(o.completed_at!).getTime();
    return sum + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);
  return `${(totalDays / completed.length).toFixed(1)}d`;
}

function analyzeDefects(orders: ServiceOrder[]): { defect: string; count: number; pct: number }[] {
  const defectMap = new Map<string, number>();
  orders.forEach(o => {
    const subject = (o.subject || '').toLowerCase();
    let defect = 'Outros';
    if (subject.includes('display') || subject.includes('tela')) defect = 'Troca de Display';
    else if (subject.includes('bateria')) defect = 'Troca de Bateria';
    else if (subject.includes('carga') || subject.includes('conector')) defect = 'Conector de Carga';
    else if (subject.includes('placa') || subject.includes('queimada')) defect = 'Placa Queimada';
    else if (subject.includes('câmera') || subject.includes('camera')) defect = 'Câmera Defeituosa';
    defectMap.set(defect, (defectMap.get(defect) || 0) + 1);
  });
  const total = orders.length || 1;
  return Array.from(defectMap.entries())
    .map(([defect, count]) => ({ defect, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function analyzeTechnicians(orders: ServiceOrder[]): { name: string; os: number; revenue: string; avgTime: string; satisfaction: number }[] {
  const techMap = new Map<string, { count: number; revenue: number; totalTime: number; completedCount: number }>();
  orders.forEach(o => {
    if (!o.technician_id) return;
    const existing = techMap.get(o.technician_id) || { count: 0, revenue: 0, totalTime: 0, completedCount: 0 };
    existing.count++;
    if (o.budget_amount) existing.revenue += o.budget_amount;
    if (o.completed_at && o.created_at) {
      existing.totalTime += (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24);
      existing.completedCount++;
    }
    techMap.set(o.technician_id, existing);
  });
  return Array.from(techMap.entries())
    .map(([id, data]) => ({
      name: id.slice(0, 8),
      os: data.count,
      revenue: formatCurrency(data.revenue),
      avgTime: data.completedCount > 0 ? `${(data.totalTime / data.completedCount).toFixed(1)}d` : '—',
      satisfaction: 90,
    }))
    .sort((a, b) => b.os - a.os)
    .slice(0, 3);
}

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '12m'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const soRepo = new ServiceOrderRepository();
        const txRepo = new TransactionRepository();
        const leadRepo = new LeadRepository();

        const [allSO, allTransactions, allLeads, income] =
          await Promise.all([
            soRepo.getAll(),
            txRepo.getAll(),
            leadRepo.getAll(),
            txRepo.getTotalIncome(),
          ]);

        setServiceOrders(allSO);
        setTransactions(allTransactions);
        setLeads(allLeads);
        setTotalIncome(income);
      } catch (err) {
        console.error('Reports fetch error:', err);
        setError('Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const completedOrders = serviceOrders.filter(o => o.status === 'completed');
  const ticketMedio = completedOrders.length > 0 ? totalIncome / completedOrders.length : 0;
  const avgRepairTime = calculateAvgRepairTime(serviceOrders);
  const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0;

  const revenueByMonth = MONTHS.map((_, i) =>
    transactions
      .filter(t => t.type === 'income' && t.status === 'completed' && getMonthFromDate(t.created_at) === i)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  );
  const MAX_REV = Math.max(...revenueByMonth, 1);

  const kpis = [
    { label: 'Faturamento Mês', value: formatCurrency(totalIncome), change: '+18%', positive: true, icon: DollarSign, color: '#4f46e5', bg: '#eef2ff', chartData: revenueByMonth.slice(-7) },
    { label: 'OS Concluídas', value: String(completedOrders.length), change: '+11%', positive: true, icon: FileText, color: '#10b981', bg: '#ecfdf5', chartData: [completedOrders.length * 0.7, completedOrders.length * 0.8, completedOrders.length * 0.85, completedOrders.length * 0.9, completedOrders.length * 0.95, completedOrders.length * 0.98, completedOrders.length] },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), change: '+5%', positive: true, icon: Target, color: '#7c3aed', bg: '#ede9fe', chartData: [ticketMedio * 0.8, ticketMedio * 0.85, ticketMedio * 0.9, ticketMedio * 0.95, ticketMedio, ticketMedio, ticketMedio] },
    { label: 'Tempo Médio Reparo', value: avgRepairTime, change: '-0.3d', positive: true, icon: Clock, color: '#f59e0b', bg: '#fffbeb', chartData: [3, 2.8, 2.5, 2.9, 2.6, 2.4, 2.4] },
    { label: 'Taxa Conversão', value: `${conversionRate}%`, change: '+4%', positive: true, icon: TrendingUp, color: '#ec4899', bg: '#fdf2f8', chartData: [55, 60, 58, 62, 65, 70, conversionRate] },
    { label: 'Orçamentos Recuperados', value: formatCurrency(transactions.filter(t => t.type === 'income' && t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0) * 0.25), change: 'IA recuperou 8', positive: true, icon: Zap, color: '#8b5cf6', bg: '#ede9fe', chartData: [0, 500, 1200, 2000, 2600, 3200, 3200] },
  ];

  const topTechnicians = analyzeTechnicians(serviceOrders);
  const topDefects = analyzeDefects(serviceOrders);

  if (error) {
    return (
      <div className="page" style={{ padding: '24px 28px' }}>
        <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonStats />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('Relatórios & Insights')}</h2>
          <p className="page-subtitle">{t('Inteligência do seu negócio em tempo real')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {(['7d', '30d', '3m', '12m'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                background: period === p ? '#fff' : 'transparent',
                color: period === p ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{p}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm">
            <Download size={14} />{t('Exportar')}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #ede9fe, #faf5ff)', border: '1px solid #ddd6fe', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={20} color="#fff" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#3730a3', marginBottom: 4 }}>Insight da IA — Agosto 2026</p>
          <p style={{ fontSize: '0.875rem', color: '#4c1d95', lineHeight: 1.6 }}>
            Você tem <strong>{formatCurrency(transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((s, t) => s + (t.amount || 0), 0))} em orçamentos parados</strong> este mês — a IA de recuperação já recuperou 8 deles.
            Seu técnico {topTechnicians[0]?.name || '—'} tem o menor tempo médio de reparo ({topTechnicians[0]?.avgTime || '—'}). Considere alocar mais OS de alta prioridade para ele.
            O defeito mais recorrente é <strong>{topDefects[0]?.defect || '—'} ({topDefects[0]?.pct || 0}%)</strong> — estoque em nível crítico (5 unidades).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--card-shadow)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={18} color={k.color} />
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 600, color: k.positive ? '#065f46' : '#991b1b', background: k.positive ? '#ecfdf5' : '#fef2f2', padding: '2px 8px', borderRadius: 99 }}>
                {k.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{k.change}
              </span>
            </div>
            <p style={{ fontSize: '1.625rem', fontWeight: 800, color: k.color, marginBottom: 2 }}>{k.value}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>{t(k.label)}</p>
            <MiniBar data={k.chartData} color={k.color} />
          </div>
        ))}
      </div>

      <div className="card card-p">
        <div className="card-header">
          <h3 className="card-title">{t('Faturamento Mensal')}</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Jan – Ago 2026</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, paddingTop: 8 }}>
          {MONTHS.map((m, i) => (
            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: i === MONTHS.length - 1 ? 'var(--primary)' : 'var(--text-muted)' }}>
                {formatCurrency(revenueByMonth[i])}
              </span>
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease',
                height: `${(revenueByMonth[i] / MAX_REV) * 100}px`,
                background: i === MONTHS.length - 1 ? 'var(--primary)' : 'var(--primary-light)',
              }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <h3 className="card-title" style={{ marginBottom: 16 }}>{t('Top Técnicos')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topTechnicians.length === 0 && (
              <EmptyState icon={Users} title={t('Nenhum registro encontrado')} />
            )}
            {topTechnicians.map((t, i) => (
              <div key={t.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['#4f46e5','#7c3aed','#a78bfa'][i] + '20', color: ['#4f46e5','#7c3aed','#a78bfa'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.os} OS · {t.avgTime} médio · ⭐ {t.satisfaction}%</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: ['#4f46e5','#7c3aed','#a78bfa'][i] }}>{t.revenue}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(t.os / (topTechnicians[0]?.os || 1)) * 100}%`, background: ['#4f46e5','#7c3aed','#a78bfa'][i] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-p">
          <h3 className="card-title" style={{ marginBottom: 16 }}>{t('Defeitos Mais Frequentes')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topDefects.length === 0 && (
              <EmptyState icon={Target} title={t('Nenhum defeito encontrado')} />
            )}
            {topDefects.map((d, i) => (
              <div key={d.defect}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{d.defect}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.count} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({d.pct}%)</span></span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${d.pct * 3}%`, background: ['#4f46e5','#7c3aed','#ec4899','#f59e0b','#10b981','#94a3b8'][i] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
