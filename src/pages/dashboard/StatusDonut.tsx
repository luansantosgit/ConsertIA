import React from 'react';
import { PieChart } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import EmptyState from '@/components/EmptyState';
import type { StatusGroupCount } from './dashboard.utils';

const SIZE = 160;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export const StatusDonut: React.FC<{ groups: StatusGroupCount[] }> = ({ groups }) => {
  const { t } = useTranslation();
  const total = groups.reduce((a, g) => a + g.count, 0);

  if (total === 0) {
    return (
      <div className="card card-p" style={{ minHeight: 260 }}>
        <div className="card-header">
          <h3 className="card-title">{t('Status das Ordens de Serviço')}</h3>
        </div>
        <EmptyState icon={PieChart} title={t('Nenhuma OS encontrada')} />
      </div>
    );
  }

  let acc = 0;

  return (
    <div className="card card-p">
      <div className="card-header">
        <h3 className="card-title">{t('Status das Ordens de Serviço')}</h3>
      </div>

      <div className="dash-donut-wrap">
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {groups.map((g) => {
              if (g.count === 0) return null;
              const len = (g.count / total) * C;
              const offset = -acc;
              acc += len;
              return (
                <circle
                  key={g.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={g.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${Math.max(len - 2, 1)} ${C - Math.max(len - 2, 1)}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  strokeLinecap="round"
                >
                  <title>{`${t(g.labelKey)}: ${g.count}`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="dash-donut-center-wrap">
            <span className="dash-donut-center">{total}</span>
            <span className="dash-donut-center-label">{t('Ordens de Serviço')}</span>
          </div>
        </div>

        <div className="dash-donut-list">
          {groups.map((g) => (
            <div key={g.key} className="dash-donut-item">
              <span className="dash-donut-item-left">
                <span className="dash-legend-dot" style={{ background: g.color }} />
                {t(g.labelKey)}
              </span>
              <span className="dash-donut-item-count">{g.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
