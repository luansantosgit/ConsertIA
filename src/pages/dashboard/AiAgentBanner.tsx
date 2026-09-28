import React from 'react';
import { Bot, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import type { DashboardStats } from './dashboard.utils';
import { pctDelta } from './dashboard.utils';

const AiStat: React.FC<{ value: number; delta: number | null; label: string }> = ({ value, delta, label }) => {
  const Icon = delta != null && delta >= 0 ? ArrowUp : ArrowDown;
  return (
    <div>
      <p className="dash-ai-stat-value">
        {value.toLocaleString('pt-BR')}
        {delta != null && (
          <span className={`dash-ai-stat-delta${delta >= 0 ? '' : ' neg'}`}>
            <Icon size={10} />
            {Math.abs(delta)}%
          </span>
        )}
      </p>
      <p className="dash-ai-stat-label">{label}</p>
    </div>
  );
};

export const AiAgentBanner: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="dash-ai-banner">
      <div className="dash-ai-icon">
        <Bot size={24} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p className="dash-ai-title">{t('Agente de IA')}</p>
        <p className="dash-ai-desc">{t('Atendimento automatizado 24/7 via WhatsApp.')}</p>
      </div>

      <div className="dash-ai-stats">
        <AiStat
          value={stats.aiChats.total}
          delta={pctDelta(stats.aiChats.thisMonth, stats.aiChats.lastMonth)}
          label={t('Atendimentos realizados')}
        />
        <AiStat
          value={stats.aiEvents.total}
          delta={pctDelta(stats.aiEvents.thisMonth, stats.aiEvents.lastMonth)}
          label={t('Agendamentos via IA')}
        />
        <AiStat
          value={stats.aiOrders.total}
          delta={pctDelta(stats.aiOrders.thisMonth, stats.aiOrders.lastMonth)}
          label={t('Ordens de serviço geradas')}
        />
      </div>

      <button className="dash-ai-btn" onClick={() => navigate('/agente-ia')}>
        {t('Ver detalhes')}
      </button>
    </div>
  );
};
