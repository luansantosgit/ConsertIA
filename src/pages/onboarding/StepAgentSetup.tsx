import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { OnboardingRepository, type AgentPresentation, type AgentSetupConfig } from './onboarding.repository';

const repo = new OnboardingRepository();

const PRESENTATIONS: { id: AgentPresentation; label: string; hint: string }[] = [
  { id: 'amigavel', label: 'Amigável', hint: 'simpática e acolhedora, como um colega que gosta de ajudar' },
  { id: 'formal', label: 'Formal', hint: 'cordial e profissional, tratando o cliente por você' },
  { id: 'tecnico', label: 'Técnica', hint: 'objetiva e clara, focada em resolver o problema' },
  { id: 'proximo', label: 'Próxima', hint: 'direta e sem enrolação, como uma conversa de balcão' },
];

const AUTOMATIONS: {
  key: 'agent_greeting' | 'agent_auto_schedule' | 'agent_auto_os';
  label: string;
  hint: string;
}[] = [
  {
    key: 'agent_greeting',
    label: 'Recepcionar com "bom dia, boa tarde ou boa noite"',
    hint: 'O agente cumprimenta o cliente conforme o horário do dia.',
  },
  {
    key: 'agent_auto_schedule',
    label: 'Agendar appointments automaticamente',
    hint: 'O agente fecha a visita na agenda assim que o cliente confirma a data.',
  },
  {
    key: 'agent_auto_os',
    label: 'Gerar orçamentos e OS automaticamente',
    hint: 'O agente abre a ordem de serviço depois do orçamento aprovado.',
  },
];

/**
 * Etapa "Configure seu agente de IA" do wizard: o lead personaliza o
 * agente antes de pagar. As escolhas vao para a sessao de onboarding e
 * sao aplicadas no ai_agent_settings quando o cadastro e finalizado.
 */
export const StepAgentSetup: React.FC<{
  token: string;
  initial?: Partial<AgentSetupConfig>;
  onDone: () => void;
  onBack: () => void;
}> = ({ token, initial, onDone, onBack }) => {
  const [name, setName] = useState(initial?.agent_name ?? 'Assistente');
  const [presentation, setPresentation] = useState<AgentPresentation>(
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
    <div>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>
        Configure seu agente de IA
      </h2>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Dê um toque pessoal: seu agente vai atender seus clientes no WhatsApp com essa cara.
      </p>

      <div className="form-group">
        <label className="form-label" htmlFor="agent-name">Nome do agente</label>
        <input
          id="agent-name"
          className="input"
          value={name}
          maxLength={40}
          placeholder="Ex.: Ana, Assistente Virtual"
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Como ela vai se apresentar</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {PRESENTATIONS.map(option => {
            const selected = presentation === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPresentation(option.id)}
                aria-pressed={selected}
                className="card"
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 6,
                  borderColor: selected ? 'var(--primary-text)' : 'var(--border)',
                  borderWidth: selected ? 1.5 : 1,
                  background: selected ? 'var(--primary-light)' : '#fff',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9375rem' }}>
                  {selected && <Check size={14} color="var(--primary-text)" />}
                  {option.label}
                </span>
                <span style={{ fontSize: '0.8125rem', color: selected ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">O que o agente faz sozinho</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AUTOMATIONS.map(item => (
            <label
              key={item.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer',
                background: 'var(--bg-secondary, transparent)',
              }}
            >
              <input
                type="checkbox"
                checked={!!automations[item.key]}
                onChange={() => toggle(item.key)}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--primary-text)' }}
              />
              <span>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>{item.label}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: '0 0 12px' }} role="alert">{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={saving}>Voltar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    </div>
  );
};
