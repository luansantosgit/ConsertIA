import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { StatusGroupCount } from './dashboard.utils';

export const StageBars: React.FC<{ groups: StatusGroupCount[] }> = ({ groups }) => {
  const { t } = useTranslation();
  const total = groups.reduce((a, g) => a + g.count, 0);

  return (
    <div className="card card-p">
      <div className="card-header">
        <h3 className="card-title">{t('Ordens por Etapa')}</h3>
      </div>

      <div className="dash-stage">
        {groups.map((g) => {
          const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
          return (
            <div key={g.key}>
              <div className="dash-stage-row-head">
                <span className="dash-stage-label">
                  <span className="dash-legend-dot" style={{ background: g.color }} />
                  {t(g.labelKey)}
                </span>
                <span className="dash-stage-count">
                  {g.count} · {pct}%
                </span>
              </div>
              <div className="dash-stage-bar">
                <div className="dash-stage-fill" style={{ width: `${pct}%`, background: g.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
