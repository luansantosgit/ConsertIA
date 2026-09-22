import React from 'react';
import {
  Activity, Brain, MessageSquare, Sparkles, Zap,
  ChevronRight, ClipboardList, Stethoscope,
} from 'lucide-react';
import type { NavItem } from './types';
import { useAiSettings } from './useAiSettings';
import { ConfigTab } from './ConfigTab';
import { BehaviorSection } from './BehaviorSection';
import { TemplatesSection } from './TemplatesSection';
import { QuotesSection } from './QuotesSection';
import { DiagnosisSection } from './DiagnosisSection';
import { IntegrationsTab } from './IntegrationsTab';
import { LogsTab } from './LogsTab';
import { useTranslation } from '@/hooks/useTranslation';

const NAV: NavItem[] = [
  { key: 'personalidade', label: 'Personalidade', icon: Sparkles },
  { key: 'comportamento', label: 'Comportamento', icon: Brain },
  { key: 'templates', label: 'Templates Diferenciais', icon: MessageSquare },
  { key: 'orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { key: 'diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
  { key: 'integracoes', label: 'Integrações', icon: Zap },
  { key: 'historico', label: 'Histórico & Métricas', icon: Activity },
];

export const AiSettings: React.FC = () => {
  const { t } = useTranslation();
  const h = useAiSettings();
  const agentActive = h.agent?.active === true;

  return (
    <div className="page">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.375rem', margin: 0 }}>{t('Agente de IA')}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            {t('Configure o especialista de atendimento da sua assistência técnica')}
          </p>
        </div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 99,
          background: agentActive ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          border: `1px solid ${agentActive ? '#86efac' : '#fca5a5'}`,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: agentActive ? '#16a34a' : '#dc2626',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: agentActive ? '#15803d' : '#b91c1c' }}>
            {agentActive ? t('Agente ativo') : t('Agente inativo')}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="card" style={{ width: 220, flexShrink: 0, overflow: 'hidden' }}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => h.setActiveSection(key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 16px', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                background: h.activeSection === key ? 'var(--primary-light)' : 'transparent',
                color: h.activeSection === key ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: h.activeSection === key ? 700 : 400,
                fontSize: '0.875rem', fontFamily: 'inherit', transition: 'background 0.1s, color 0.1s',
                borderLeft: h.activeSection === key ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} />
                {t(label)}
              </span>
              {h.activeSection === key && <ChevronRight size={13} />}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {h.loading && <div className="card card-p">{t('Carregando configurações...')}</div>}

          {!h.loading && h.activeSection === 'personalidade' && (
            <ConfigTab
              agentName={h.agent?.agent_name ?? ''}
              agentDesc={h.agentDesc}
              onSave={(agentName, agentDesc) => h.savePersonality(agentName, agentDesc)}
              saving={h.saving}
              saved={h.saved}
            />
          )}

          {!h.loading && h.activeSection === 'comportamento' && (
            <BehaviorSection agent={h.agent} saving={h.saving} saved={h.saved} onSave={h.saveAgent} />
          )}

          {!h.loading && h.activeSection === 'templates' && (
            <TemplatesSection
              templates={h.templates}
              loading={h.loading}
              onCreate={h.createTemplate}
              onUpdate={h.updateTemplate}
              onDelete={h.deleteTemplate}
            />
          )}

          {!h.loading && h.activeSection === 'orcamentos' && (
            <QuotesSection quote={h.quote} saving={h.saving} saved={h.saved} onSave={h.saveQuote} />
          )}

          {!h.loading && h.activeSection === 'diagnosticos' && (
            <DiagnosisSection diagnosis={h.diagnosis} saving={h.saving} saved={h.saved} onSave={h.saveDiagnosis} />
          )}

          {!h.loading && h.activeSection === 'integracoes' && (
            <IntegrationsTab
              agent={h.agent}
              usesPlatformToken={h.usesPlatformToken}
              usageTokens={h.usageTokens}
              tokenLimit={h.tokenLimit}
              saving={h.saving}
              saved={h.saved}
              onSave={h.saveAgent}
            />
          )}

          {!h.loading && h.activeSection === 'historico' && (
            <LogsTab
              aiLogs={h.aiLogs}
              totalLogsCount={h.totalLogsCount}
              totalCost={h.totalCost}
              loadingLogs={h.loadingLogs}
              expandedLog={h.expandedLog}
              setExpandedLog={h.setExpandedLog}
              formatDate={h.formatDate}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};
