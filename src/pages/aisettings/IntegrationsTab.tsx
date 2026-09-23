import React, { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AiAgentSettings } from '@/types';

interface IntegrationsTabProps {
  agent: AiAgentSettings | null;
  usesPlatformToken: boolean;
  usageTokens: number;
  tokenLimit: number | null;
  saving: boolean;
  saved: boolean;
  onSave: (partial: Partial<AiAgentSettings>) => void;
}

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini — econômico e rápido' },
  { id: 'openai/gpt-4o', label: 'GPT-4o — mais assertivo (multimodal)' },
  { id: 'deepseek/deepseek-chat-v4-flash', label: 'DeepSeek V4 Flash — rápido e econômico' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet — conversacional' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 — rápido e barato' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B — open source' },
];

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  agent, usesPlatformToken, usageTokens, tokenLimit, saving, saved, onSave,
}) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');

  if (!agent) return null;

  const usagePercent = tokenLimit && tokenLimit > 0 ? Math.min(100, Math.round((usageTokens / tokenLimit) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="var(--primary)" /> {t('Integrações de IA')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {t('O agente usa o OpenRouter como provedor de modelos de linguagem.')}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">{t('Modelo principal')}</label>
          <select
            className="select"
            value={agent.openrouter_model}
            onChange={e => onSave({ openrouter_model: e.target.value })}
          >
            {OPENROUTER_MODELS.map(model => (
              <option key={model.id} value={model.id}>{model.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t('Chave OpenRouter')}</label>
          {usesPlatformToken ? (
            <p style={{
              fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0,
              padding: '10px 14px', borderRadius: 10, background: 'var(--bg-secondary, #f5f5f5)',
              border: '1px solid var(--border)',
            }}>
              {t('Sua empresa usa o token central da plataforma, gerenciado pelo administrador. Não é necessário configurar nada aqui.')}
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input" type="password" value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
              <button
                className="btn btn-primary"
                disabled={!apiKey.trim() || saving}
                onClick={() => { onSave({ own_api_key: apiKey.trim() }); setApiKey(''); }}
              >
                {t('Salvar chave')}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="form-label">{t('Consumo de tokens este mês')}</label>
          <div style={{
            height: 10, borderRadius: 99, background: 'var(--bg-secondary, #e5e7eb)',
            overflow: 'hidden', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: `${usagePercent}%`, height: '100%', borderRadius: 99,
              background: usagePercent >= 90 ? 'var(--danger)' : 'var(--primary)',
              transition: 'width 0.3s',
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {usageTokens.toLocaleString('pt-BR')} tokens {tokenLimit && tokenLimit > 0 ? `de ${tokenLimit.toLocaleString('pt-BR')} (${usagePercent}%)` : ''}
            {(!tokenLimit || tokenLimit <= 0) ? ` — ${t('sem limite configurado')}` : usagePercent >= 100 ? ` — ${t('cota esgotada, fale com o administrador')}` : ''}
          </p>
        </div>

        {(saving || saved) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: saved ? '#16a34a' : 'var(--text-muted)' }}>
            {saved ? <><Check size={14} /> {t('Configurações salvas!')}</> : t('Salvando...')}
          </div>
        )}
      </div>
    </div>
  );
};
