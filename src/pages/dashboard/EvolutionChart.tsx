import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { countByDay } from './dashboard.utils';

interface EvolutionChartProps {
  eventDates: (string | undefined | null)[];
  orderCreatedDates: (string | undefined | null)[];
  orderCompletedDates: (string | undefined | null)[];
}

const SERIES_COLORS = ['#8b5cf6', '#0ea5e9', '#22c55e'];
const PAD = { top: 12, right: 12, bottom: 24, left: 34 };
const HEIGHT = 220;

function dayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function linePath(values: number[], w: number, max: number): string {
  const innerW = w - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD.left + step * i;
      const y = PAD.top + innerH - (max > 0 ? (v / max) * innerH : 0);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('');
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ eventDates, orderCreatedDates, orderCompletedDates }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(
    () => [
      countByDay(eventDates, days),
      countByDay(orderCreatedDates, days),
      countByDay(orderCompletedDates, days),
    ],
    [eventDates, orderCreatedDates, orderCompletedDates, days]
  );

  const labels = useMemo(
    () => [t('Agendamentos'), t('OS Criadas'), t('Concluídas')],
    [t]
  );

  const max = Math.max(4, ...series.flat());
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const gridValues = [0, Math.round(max / 2), max];

  return (
    <div className="card card-p" ref={ref}>
      <div className="card-header">
        <h3 className="card-title">{t('Evolução de Atendimentos')}</h3>
        <div className="dash-toggle">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`dash-toggle-btn${days === d ? ' active' : ''}`}
              onClick={() => setDays(d)}
            >
              {t(`${d} dias`)}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-legend" style={{ marginBottom: 10 }}>
        {labels.map((l, i) => (
          <span key={l}>
            <span className="dash-legend-dot" style={{ background: SERIES_COLORS[i] }} />
            {l}
          </span>
        ))}
      </div>

      <svg width="100%" height={HEIGHT} role="img" aria-label={t('Evolução de Atendimentos')}>
        {gridValues.map((v) => {
          const y = PAD.top + innerH - (v / max) * innerH;
          return (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 4" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                {v}
              </text>
            </g>
          );
        })}
        {series.map((values, si) => (
          <g key={labels[si]}>
            <path
              d={linePath(values, width, max)}
              fill="none"
              stroke={SERIES_COLORS[si]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>{`${labels[si]}: ${values.reduce((a, b) => a + b, 0)}`}</title>
            </path>
          </g>
        ))}
        {[0, Math.floor((days - 1) / 2), days - 1].map((idx) => {
          const innerW = width - PAD.left - PAD.right;
          const x = PAD.left + (days > 1 ? (innerW / (days - 1)) * idx : 0);
          return (
            <text key={idx} x={x} y={HEIGHT - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              {dayLabel(days - 1 - idx)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
