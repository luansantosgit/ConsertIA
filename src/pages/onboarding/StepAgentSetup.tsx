import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { OnboardingRepository, type AgentSetupConfig } from './onboarding.repository';
import { AGENT_PRESENTATIONS, type AgentPresentationStyle } from '@/lib/agent-presentation';

const repo = new OnboardingRepository();

const AUTOMATIONS: {
  key: 'agent_greeting' | 'agent_auto_schedule' | 'agent_auto_os';
  label: string;
  hint: string;
}[] = [
  {
    key: 'agent_greeting',
    label: 'Recepcionar com "bom dia, boa tarde ou boa noite"',
    hint: 'Cumprimenta o cliente conforme o horário do dia.',
  },
  {
    key: 'agent_auto_schedule',
    label: 'Agendar appointments automaticamente',
    hint: 'Fecha a visita na agenda quando o cliente confirma a data.',
  },
  {
    key: 'agent_auto_os',
    label: 'Gerar orçamentos e OS automaticamente',
    hint: 'Abre a ordem de serviço depois do orçamento aprovado.',
  },
];

/**
 * Etapa "Configure seu agente de IA" do wizard: o lead personaliza o
 * agente antes de pagar. As escolhas vao para a sessao de onboarding e
 * sao aplicadas no ai_agent_settings quando o cadastro e finalizado.
 *
 * Layout compacto (Issue #96): estilos em 2 colunas e blocos enxutos
 * para a etapa caber na tela do mobile sem scroll.
 */
export const StepAgentSetup: React.FC<{
  token: string;
  initial?: Partial<AgentSetupConfig>;
  onDone: () => void;
  onBack: () => void;
}> = ({ token, initial, onDone, onBack }) => {
  const [name, setName] = useState(initial?.agent_name ?? 'Assistente');
  const [presentation, setPresentation] = useState<AgentPresentationStyle>(
    initial?.agent_presentation ?? 'amigavel',
  );
  const [automations, setAutomations] = useState<Record<string, boolean>>({
    agent_greeting: initial?.agent_greeting ?? true,
    agent_auto_schedule: initial?.agent_auto_schedule ?? true,
    agent_auto_os: initial?.agent_auto_os ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) =>
    setAutomations(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await repo.setAgent(token, {
        agent_name: name.trim() || 'Assistente',
        agent_presentation: presentation,
        agent_greeting: automations.agent_greeting,
        agent_auto_schedule: automations.agent_auto_schedule,
        agent_auto_os: automations.agent_auto_os,
      });
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 2px' }}>
          Configure seu agente de IA
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Dê um toque pessoal no seu agente.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="agent-name">Nome do agente</label>
        <input
          id="agent-name"
          className="input"
          style={{ padding: '8px 12px' }}
          value={name}
          maxLength={40}
          placeholder="Ex.: Ana, Assistente Virtual"
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Como ela vai se apresentar</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {AGENT_PRESENTATIONS.map(option => {
            const selected = presentation === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPresentation(option.id)}
                aria-pressed={selected}
                className="card"
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: '8px 10px',
                  display: 'flex', flexDirection: 'column', gap: 2,
                  borderColor: selected ? 'var(--primary-text)' : 'var(--border)',
                  borderWidth: selected ? 1.5 : 1,
                  background: selected ? 'var(--primary-light)' : '#fff',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '0.8125rem' }}>
                  {selected && <Check size={12} color="var(--primary-text)" />}
                  {option.label}
                </span>
                <span style={{ fontSize: '0.6875rem', lineHeight: 1.35, color: selected ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">O que o agente faz sozinho</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {AUTOMATIONS.map(item => (
            <label
              key={item.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px',
                border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                background: 'var(--bg-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={!!automations[item.key]}
                onChange={() => toggle(item.key)}
                style={{ marginTop: 2, width: 15, height: 15, accentColor: 'var(--primary-text)' }}
              />
              <span>
                <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600 }}>{item.label}</span>
                <span style={{ display: 'block', fontSize: '0.6875rem', lineHeight: 1.35, color: 'var(--text-muted)' }}>{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }} role="alert">{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={saving}>Voltar</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    </div>
  );
};
