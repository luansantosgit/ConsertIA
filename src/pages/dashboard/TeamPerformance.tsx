import React from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import EmptyState from '@/components/EmptyState';
import type { TeamRow } from './dashboard.utils';
import { formatHours } from './dashboard.utils';

export const TeamPerformance: React.FC<{ team: TeamRow[] }> = ({ team }) => {
  const { t } = useTranslation();

  return (
    <div className="card card-p">
      <div className="card-header">
        <h3 className="card-title">{t('Desempenho da Equipe')}</h3>
      </div>

      {team.length === 0 && <EmptyState icon={Users} title={t('Nenhuma OS atribuída a técnicos')} />}

      {team.length > 0 && (
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>{t('Atendente')}</th>
                <th>{t('OS Concluídas')}</th>
                <th>{t('Tempo Médio')}</th>
                <th>{t('Taxa de Sucesso')}</th>
              </tr>
            </thead>
            <tbody>
              {team.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name || t('Sem técnico')}</td>
                  <td>{r.completed}</td>
                  <td>{formatHours(r.avgHours)}</td>
                  <td>{r.successRate != null ? `${r.successRate}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
