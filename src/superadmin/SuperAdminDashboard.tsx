import React, { useState, useEffect } from 'react';
import {
  Building2, Users, CreditCard, TrendingUp,
  ArrowUpRight, Activity, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DbTenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string;
  active: boolean;
  created_at: string;
}

interface DbPlan {
  id: string;
  name: string;
  price: number;
}

interface StatsData {
  activeCompanies: number;
  totalUsers: number;
  mrr: string;
}

interface RecentCompany {
  name: string;
  plan: string;
  users: number;
  status: string;
  revenue: string;
  joined: string;
}

interface PlanDistItem {
  name: string;
  count: number;
  color: string;
}

interface AlertItem {
  icon: React.FC<{ size?: number; color?: string }>;
  text: string;
  sub: string;
  color: string;
  bg: string;
}

const COLORS = ['#94a3b8', '#6366f1', '#8b5cf6', '#059669', '#f59e0b', '#3b82f6'];

export const SuperAdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<StatsData>({ activeCompanies: 0, totalUsers: 0, mrr: 'R$0' });
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [planDist, setPlanDist] = useState<PlanDistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, usersRes, plansRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('id, tenant_id', { count: 'exact', head: true }),
        supabase.from('plans').select('*'),
      ]);

      const tenants = tenantsRes.data || [];
      const plans = plansRes.data || [];

      const priceMap: Record<string, number> = {};
      for (const p of plans) { priceMap[p.id] = p.price; }

      let mrr = 0;
      const countByPlan: Record<string, number> = {};
      for (const t of tenants) {
        if (t.plan_id && priceMap[t.plan_id]) mrr += priceMap[t.plan_id];
        const planName = plans.find((p: DbPlan) => p.id === t.plan_id)?.name || 'Sem plano';
        countByPlan[planName] = (countByPlan[planName] || 0) + 1;
      }

      setPlanDist(Object.entries(countByPlan).map(([name, count], i) => ({ name, count, color: COLORS[i % COLORS.length] })));
      setStatsData({
        activeCompanies: tenants.filter((t: DbTenant) => t.active).length,
        totalUsers: usersRes.count ?? 0,
        mrr: mrr >= 1000 ? `R$${(mrr / 1000).toFixed(1)}k` : `R$${mrr}`,
      });

      setRecentCompanies(tenants.slice(0, 5).map((t: DbTenant) => ({
        name: t.name,
        plan: plans.find((p: DbPlan) => p.id === t.plan_id)?.name || 'Sem plano',
        users: 0,
        status: t.active ? 'Ativo' : 'Inativo',
        revenue: `R$${priceMap[t.plan_id] || 0}`,
        joined: new Date(t.created_at).toLocaleDateString('pt-BR'),
      })));

      const healthyCount = tenants.filter((t: DbTenant) => t.active).length;
      const inactiveCount = tenants.filter((t: DbTenant) => !t.active).length;
      const a: AlertItem[] = [];
      if (inactiveCount > 0) a.push({ icon: AlertTriangle, text: `${inactiveCount} empresa${inactiveCount > 1 ? 's' : ''} inativa${inactiveCount > 1 ? 's' : ''}`, sub: 'Empresas com assinatura cancelada ou pausada', color: '#ef4444', bg: '#fee2e2' });
      a.push({ icon: Activity, text: `${Object.keys(countByPlan).length} planos ativos`, sub: 'Planos disponíveis na plataforma', color: '#f59e0b', bg: '#fef3c7' });
      a.push({ icon: CheckCircle2, text: `${healthyCount} empresa${healthyCount > 1 ? 's' : ''} saudável${healthyCount > 1 ? 's' : ''}`, sub: 'Assinaturas em dia', color: '#10b981', bg: '#d1fae5' });
      setAlerts(a);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: Building2, label: 'Empresas Ativas', value: String(statsData.activeCompanies), positive: true, color: '#6366f1', bg: '#ede9fe', change: '' },
    { icon: Users, label: 'Usuários Total', value: String(statsData.totalUsers), positive: true, color: '#10b981', bg: '#d1fae5', change: '' },
    { icon: CreditCard, label: 'MRR', value: statsData.mrr, positive: true, color: '#f59e0b', bg: '#fef3c7', change: '' },
    { icon: TrendingUp, label: 'Taxa de Churn', value: '0%', positive: true, color: '#3b82f6', bg: '#dbeafe', change: '' },
  ];

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" color="#6366f1" />
          <p style={{ color: 'var(--text-muted)' }}>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral da plataforma ConsertIA</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary">Exportar relatório</button>
          <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}>
            <Building2 size={16} />
            Nova empresa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.color} />
              </div>
              <span className={`stat-card-change ${s.positive ? 'positive' : 'negative'}`}>
                <ArrowUpRight size={12} />
                {s.change}
              </span>
            </div>
            <div>
              <p className="stat-card-value">{s.value}</p>
              <p className="stat-card-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mid row */}
      <div className="grid-2">
        {/* Plan distribution */}
        <div className="card card-p">
          <div className="card-header">
            <h3 className="card-title">Distribuição de Planos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {planDist.map((p) => (
              <div key={p.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{p.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>empresas</span></span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(p.count / Math.max(statsData.activeCompanies, 1)) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="card card-p">
          <div className="card-header">
            <h3 className="card-title">Alertas do Sistema</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a) => (
              <div key={a.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: a.bg + '50', border: `1px solid ${a.bg}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <a.icon size={16} color={a.color} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.text}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Companies table */}
      <div className="card">
        <div className="card-header card-p" style={{ marginBottom: 0, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h3 className="card-title">Empresas Recentes</h3>
          <a href="/superadmin/empresas" className="btn btn-secondary btn-sm">Ver todas</a>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Usuários</th>
                <th>Receita</th>
                <th>Status</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map((c) => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className="badge badge-primary">{c.plan}</span></td>
                  <td>{c.users}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.revenue}/mês</td>
                  <td>
                    <span className={`badge ${
                      c.status === 'Ativo' ? 'badge-success' :
                      c.status === 'Trial' ? 'badge-warning' :
                      'badge-danger'
                    }`}>{c.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{c.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
