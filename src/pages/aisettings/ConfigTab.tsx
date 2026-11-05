import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  AGENT_PRESENTATIONS,
  type AgentPresentationStyle,
} from '@/lib/agent-presentation';

interface ConfigTabProps {
  agentName: string;
  agentDesc: string;
  presentationStyle: AgentPresentationStyle;
  onSave: (agentName: string, agentDesc: string, presentationStyle: AgentPresentationStyle) => void;
  saving: boolean;
  saved: boolean;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  agentName, agentDesc, presentationStyle, onSave, saving, saved,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(agentName);
  const [description, setDescription] = useState(agentDesc);
  const [style, setStyle] = useState<AgentPresentationStyle>(presentationStyle);

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Identidade do Agente')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Como o agente se apresenta e saúda os seus clientes. O roteiro completo de assistência técnica já vem configurado.')}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, background: 'var(--primary-light)' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--primary)', color: '#fff',
        }}>
          <Bot size={24} />
        </div>
        <div>
          <strong style={{ fontSize: '0.9375rem' }}>{name || t('Assistente')}</strong>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {t('"Bom dia! Eu sou {nome}, assistente de suporte da {empresa}. Como posso te ajudar hoje?"')}
          </p>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('Nome do agente')}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ana" />
        </div>
      </div>

      {/* Persona/tom do agente (Issue #97): mesmo valor usado no wizard
          público — ai_agent_settings.presentation_style */}
      <div className="form-group">
        <span className="form-label">{t('Como o agente se apresenta')}</span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '-2px 0 8px' }}>
          {t('Define o tom da conversa com o cliente. O roteiro de atendimento (triagem, orçamento, agenda e transferência) continua o mesmo.')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          {AGENT_PRESENTATIONS.map(option => {
            const selected = style === option.id;
            return (
              <label
                key={option.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  border: `1px solid ${selected ? 'var(--primary-text)' : 'var(--border)'}`,
                  borderWidth: selected ? 1.5 : 1,
                  borderRadius: 10, cursor: 'pointer',
                  background: selected ? 'var(--primary-light)' : 'var(--card-bg, #fff)',
                }}
              >
                <input
                  type="radio"
                  name="agent-presentation"
                  value={option.id}
                  checked={selected}
                  onChange={() => setStyle(option.id)}
                  style={{ marginTop: 3, accentColor: 'var(--primary-text)' }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700 }}>{t(option.label)}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t(option.hint)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t('Contexto adicional do agente')}</label>
        <textarea
          className="input" rows={4} style={{ resize: 'vertical', fontFamily: 'inherit' }}
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder={t('Ex: Somos especializados em iPhone e Samsung, prazo médio de 2 dias úteis...')}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {t('Este texto é usado como contexto extra para o modelo de linguagem.')}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-primary"
          onClick={() => onSave(name, description, style)}
          disabled={saving}
        >
          {t('Salvar identidade')}
        </button>
        {saved && (
          <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>{t('Identidade salva!')}</span>
        )}
      </div>
    </div>
  );
};
