import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AiAgentSettings } from '@/types';

interface BehaviorSectionProps {
  agent: AiAgentSettings | null;
  saving: boolean;
  saved: boolean;
  onSave: (partial: Partial<AiAgentSettings>) => void;
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer',
      background: 'var(--bg-secondary, transparent)',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--primary)' }}
      />
      <span>
        <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</span>
      </span>
    </label>
  );
}

export const BehaviorSection: React.FC<BehaviorSectionProps> = ({ agent, saving, saved, onSave }) => {
  const { t } = useTranslation();
  if (!agent) return null;

  const set = (key: keyof AiAgentSettings, value: boolean | string) => {
    onSave({ [key]: value } as Partial<AiAgentSettings>);
  };

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Comportamento do Agente')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Estas regras são aplicadas imediatamente em todos os atendimentos do agente.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        <Toggle
          label={t('Agente ativo')}
          description={t('Quando ativo, o agente de IA atende os leads nos canais com IA habilitada.')}
          checked={agent.active}
          onChange={v => set('active', v)}
        />
        <Toggle
          label={t('Saudação calorosa')}
          description={t('Sauda o cliente com o período do dia, o nome do agente e o nome da empresa.')}
          checked={agent.greeting_enabled}
          onChange={v => set('greeting_enabled', v)}
        />
        <Toggle
          label={t('Perguntar nome do lead')}
          description={t('Na primeira interação o agente pergunta o nome do cliente, salva no sistema e o chama pelo nome nos próximos atendimentos.')}
          checked={agent.ask_name_enabled}
          onChange={v => set('ask_name_enabled', v)}
        />
        <Toggle
          label={t('Simular digitação')}
          description={t('Exibe "digitando..." no WhatsApp antes de cada mensagem, como um humano.')}
          checked={agent.typing_simulation}
          onChange={v => set('typing_simulation', v)}
        />
        <Toggle
          label={t('Criar OS automaticamente')}
          description={t('Após orçamento aprovado e data confirmada, o agente abre a OS.')}
          checked={agent.auto_os_enabled}
          onChange={v => set('auto_os_enabled', v)}
        />
        <Toggle
          label={t('Agendar automaticamente')}
          description={t('Cria o evento no calendário quando o cliente confirma a data.')}
          checked={agent.auto_schedule_enabled}
          onChange={v => set('auto_schedule_enabled', v)}
        />
        <Toggle
          label={t('Transferir aparelhos fora da cobertura')}
          description={t('Se o aparelho não estiver em Aparelhos Atendidos, o agente transfere direto para um atendente.')}
          checked={agent.uncovered_transfer}
          onChange={v => set('uncovered_transfer', v)}
        />
        <Toggle
          label={t('Responder em grupos')}
          description={t('Permite que o agente responda mensagens em conversas de grupo. Desativado, ele ignora grupos completamente.')}
          checked={agent.respond_in_groups}
          onChange={v => set('respond_in_groups', v)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('Após transferir para atendente')}</label>
        <select className="select" value={agent.post_handoff_behavior} onChange={e => set('post_handoff_behavior', e.target.value)}>
          <option value="continue">{t('Continuar interagindo ciente da OS (padrão)')}</option>
          <option value="pause">{t('Silenciar — atendente assume totalmente')}</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">{t('Mensagem ao transferir para atendente')}</label>
        <textarea
          className="input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }}
          defaultValue={agent.handoff_message}
          onBlur={e => { if (e.target.value !== agent.handoff_message) set('handoff_message', e.target.value); }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('Mensagem para aparelhos fora da cobertura')}</label>
        <textarea
          className="input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }}
          defaultValue={agent.transfer_message}
          onBlur={e => { if (e.target.value !== agent.transfer_message) set('transfer_message', e.target.value); }}
        />
      </div>

      {(saving || saved) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: saved ? '#16a34a' : 'var(--text-muted)' }}>
          {saved ? <><Check size={14} /> {t('Configurações salvas!')}</> : t('Salvando...')}
        </div>
      )}
    </div>
  );
};
