import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { DashboardStats } from './dashboard.utils';

const Spark: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const W = 120;
  const H = 40;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(step * i).toFixed(1)},${(H - 4 - (v / max) * (H - 8)).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', marginTop: 8 }}>
      <path d={`${pts} L${W},${H} L0,${H} Z`} fill={color} opacity="0.12" />
      <path d={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
};

export const ClientAnalysis: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const { t } = useTranslation();

  const boxes = [
    { label: t('Novos Clientes'), pct: stats.newPct, spark: stats.newSpark, color: '#8b5cf6', detail: `${stats.newThisMonth} ${t('clientes')}` },
    { label: t('Clientes de Retorno'), pct: stats.returningPct, spark: stats.returningSpark, color: '#3b82f6', detail: `${stats.returningCount} ${t('clientes')}` },
  ];

  return (
    <div className="card card-p">
      <div className="card-header">
        <h3 className="card-title">{t('Análise de Clientes')}</h3>
      </div>

      <div className="dash-client-grid">
        {boxes.map((b) => (
          <div key={b.label} className="dash-client-box">
            <p className="dash-client-label">{b.label}</p>
            <p className="dash-client-pct" style={{ color: b.color }}>
              {b.pct}%
            </p>
            <p className="dash-client-detail">{b.detail}</p>
            <Spark values={b.spark} color={b.color} />
          </div>
        ))}
      </div>
    </div>
  );
};
