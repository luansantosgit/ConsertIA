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
import { supabase } from '@/lib/supabase';
import { Sparkles } from 'lucide-react';

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
  const [aiInsight, setAiInsight] = useState<{ insights: string; created_at: string } | null>(null);

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

        const { data: insight } = await supabase
          .from('ai_insights')
          .select('insights, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (insight) setAiInsight({ insights: insight.insights, created_at: insight.created_at });
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

  const now = new Date();
  const monthIdx = now.getMonth();
  const prevIdx = monthIdx === 0 ? 11 : monthIdx - 1;
  const inMonth = <T extends { created_at?: string; completed_at?: string }>(arr: T[], idx: number, field: 'created_at' | 'completed_at' = 'created_at'): T[] =>
    arr.filter(x => { const v = x[field]; if (!v) return false; const d = new Date(v); return d.getMonth() === idx && d.getFullYear() === now.getFullYear(); });
  const sumIncome = (idx: number) => inMonth(transactions, idx).filter(t => t.type === 'income' && t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
  const incomeNow = sumIncome(monthIdx);
  const incomePrev = sumIncome(prevIdx);
  const deltaPct = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
  const completedNow = inMonth(serviceOrders, monthIdx, 'completed_at').length;
  const completedPrev = inMonth(serviceOrders, prevIdx, 'completed_at').length;
  const budgetMonth = inMonth(serviceOrders, monthIdx).reduce((s, o) => s + (o.budget_amount || 0), 0);

  const kpis = [
    { label: 'Faturamento Mês', value: formatCurrency(incomeNow), change: deltaPct(incomeNow, incomePrev) != null ? (deltaPct(incomeNow, incomePrev)! > 0 ? '+' : '') + deltaPct(incomeNow, incomePrev) + '%' : '', positive: (incomeNow ?? 0) >= incomePrev, icon: DollarSign, color: 'var(--primary-text)', bg: 'var(--primary-light)', chartData: revenueByMonth.slice(-7) },
    { label: 'OS Concluídas (Mês)', value: String(completedNow), change: deltaPct(completedNow, completedPrev) != null ? (deltaPct(completedNow, completedPrev)! > 0 ? '+' : '') + deltaPct(completedNow, completedPrev) + '%' : '', positive: completedNow >= completedPrev, icon: FileText, color: '#10b981', bg: '#ecfdf5', chartData: revenueByMonth.slice(-7) },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), change: '', positive: true, icon: Target, color: 'var(--primary-text)', bg: 'var(--primary-light)', chartData: [] },
    { label: 'Tempo Médio Reparo', value: avgRepairTime, change: '', positive: true, icon: Clock, color: '#f59e0b', bg: '#fffbeb', chartData: [] },
    { label: 'Taxa Conversão', value: conversionRate + '%', change: '', positive: true, icon: TrendingUp, color: '#ec4899', bg: '#fdf2f8', chartData: [] },
    { label: 'Valor Orçado (Mês)', value: formatCurrency(budgetMonth), change: '', positive: true, icon: Zap, color: '#8b5cf6', bg: 'var(--primary-light)', chartData: [] },
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
          <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: 8, padding: 3 }}>
            {(['7d', '30d', '3m', '12m'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                background: period === p ? 'var(--card-bg)' : 'transparent',
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

      <div className="card card-p" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#7c3aed" /> Insights da IA
          </h3>
          {aiInsight && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {new Date(aiInsight.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · análise automática a cada 12h
            </span>
          )}
        </div>
        {aiInsight ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiInsight.insights.split(/\n+/).filter(Boolean).map((line, idx) => (
              <p key={idx} style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{line.trim()}</p>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            A primeira análise automática chega em até 12 horas — leitura completa de OS, financeiro, clientes e agenda.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--card-shadow)', transition: 'transform 0.15s, box-shadow 0.15s' }}
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
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: i === MONTHS.length - 1 ? 'var(--primary-text)' : 'var(--text-muted)' }}>
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
