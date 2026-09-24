import React from 'react';
import { UserPlus, Repeat, Wrench, Clock, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { DashboardStats } from './dashboard.utils';
import { pctDelta, formatHours } from './dashboard.utils';

interface KpiConfig {
  icon: React.ElementType;
  label: string;
  value: string;
  delta: number | null;
  lowerIsBetter?: boolean;
  footer: string;
  gradient?: 'purple' | 'blue';
  iconBg: string;
  iconColor: string;
}

const DeltaBadge: React.FC<{ delta: number | null; lowerIsBetter?: boolean; light?: boolean }> = ({ delta, lowerIsBetter, light }) => {
  const { t } = useTranslation();
  if (delta == null) return null;
  const good = lowerIsBetter ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? ArrowUp : ArrowDown;
  const cls = light
    ? 'dash-kpi-delta dash-kpi-delta--light'
    : `dash-kpi-delta ${good ? 'up' : 'down'}`;
  return (
    <span className={cls} title={t('em relação ao mês anterior')}>
      <Icon size={12} />
      {Math.abs(delta)}%
    </span>
  );
};

export const KpiRow: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const { t } = useTranslation();

  const kpis: KpiConfig[] = [
    {
      icon: UserPlus,
      label: t('Novos Clientes'),
      value: String(stats.newThisMonth),
      delta: pctDelta(stats.newThisMonth, stats.newLastMonth),
      footer: `${stats.newPct}% ${t('do total de clientes')}`,
      gradient: 'purple',
      iconBg: 'rgba(255,255,255,0.18)',
      iconColor: '#fff',
    },
    {
      icon: Repeat,
      label: t('Clientes de Retorno'),
      value: String(stats.returningCount),
      delta: pctDelta(stats.returningThisMonth, stats.returningLastMonth),
      footer: `${stats.returningPct}% ${t('do total de clientes')}`,
      gradient: 'blue',
      iconBg: 'rgba(255,255,255,0.18)',
      iconColor: '#fff',
    },
    {
      icon: Wrench,
      label: t('Ordens de Serviço'),
      value: String(stats.ordersThisMonth),
      delta: pctDelta(stats.ordersThisMonth, stats.ordersLastMonth),
      footer: `${t('Em andamento')}: ${stats.inProgressCount}`,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
    },
    {
      icon: Clock,
      label: t('Tempo Médio de Atendimento'),
      value: formatHours(stats.avgHoursThisMonth),
      delta: stats.avgHoursThisMonth != null && stats.avgHoursLastMonth != null
        ? pctDelta(Math.round(stats.avgHoursThisMonth), Math.round(stats.avgHoursLastMonth))
        : null,
      lowerIsBetter: true,
      footer: t('Meta: até 4h'),
      iconBg: '#ede9fe',
      iconColor: '#7c3aed',
    },
    {
      icon: Target,
      label: t('Taxa de Conversão (Agenda → OS)'),
      value: stats.conversionPct != null ? `${stats.conversionPct}%` : '—',
      delta: stats.conversionDeltaPct,
      footer: `${t('Total de agendamentos')}: ${stats.totalEvents}`,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
    },
  ];

  return (
    <div className="dash-kpis">
      {kpis.map((k) => (
        <div key={k.label} className={`dash-kpi${k.gradient ? ` dash-kpi--${k.gradient}` : ''}`}>
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon" style={{ background: k.iconBg }}>
              <k.icon size={20} color={k.iconColor} />
            </div>
            <DeltaBadge delta={k.delta} lowerIsBetter={k.lowerIsBetter} light={!!k.gradient} />
          </div>
          <div>
            <p className="dash-kpi-value">{k.value}</p>
            <p className="dash-kpi-label">{k.label}</p>
          </div>
          <p className="dash-kpi-footer">{k.footer}</p>
        </div>
      ))}
    </div>
  );
};
