import React, { useState, useEffect } from 'react';
import { Check, Zap, Eye, EyeOff, Wallet, Coins } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AiAgentSettings } from '@/types';
import { OPENROUTER_MODELS } from '@/lib/openrouter-models';

interface IntegrationsTabProps {
  agent: AiAgentSettings | null;
  usesPlatformToken: boolean;
  usageTokens: number;
  usageCost?: number;
  tokenLimit: number | null;
  allowedModels?: string[];
  defaultModel?: string;
  saving: boolean;
  saved: boolean;
  onSave: (partial: Partial<AiAgentSettings>) => void;
}

interface OpenRouterCredits {
  totalCredits: number | null;
  totalUsage: number | null;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  agent, usesPlatformToken, usageTokens, usageCost = 0, tokenLimit,
  allowedModels = [], defaultModel = '', saving, saved, onSave,
}) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [credits, setCredits] = useState<OpenRouterCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const savedKey = agent?.own_api_key ?? '';
  const restricted = usesPlatformToken && allowedModels.length > 0;
  const visibleModels = restricted
    ? OPENROUTER_MODELS.filter(m => allowedModels.includes(m.id))
    : OPENROUTER_MODELS;
  const effectiveDefault = defaultModel && allowedModels.includes(defaultModel) ? defaultModel : allowedModels[0];
  const isDefaultChoice = restricted && agent?.openrouter_model === effectiveDefault;

  const revealKey = () => {
    const next = !showKey;
    setShowKey(next);
    if (next && !apiKey && savedKey) setApiKey(savedKey);
  };

  const dirty = !!apiKey.trim() && apiKey.trim() !== savedKey;

  // Saldo do OpenRouter — somente com token próprio (a chave é da própria empresa)
  useEffect(() => {
    if (usesPlatformToken || !savedKey) {
      setCredits(null);
      return;
    }
    let active = true;
    setCreditsLoading(true);
    fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${savedKey}` },
    })
      .then(r => r.json())
      .then((data: { data?: { total_credits?: number; total_usage?: number } }) => {
        if (!active) return;
        setCredits({
          totalCredits: data?.data?.total_credits ?? null,
          totalUsage: data?.data?.total_usage ?? null,
        });
      })
      .catch(() => { if (active) setCredits(null); })
      .finally(() => { if (active) setCreditsLoading(false); });
    return () => { active = false; };
  }, [usesPlatformToken, savedKey]);

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
            {visibleModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.label}
                {effectiveDefault && model.id === effectiveDefault ? ' — padrão' : ''}
              </option>
            ))}
          </select>
          {isDefaultChoice && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {t('Modelo padrão definido pelo administrador — altere se preferir.')}
            </p>
          )}
          {restricted && !visibleModels.some(m => m.id === agent.openrouter_model) && effectiveDefault && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--warning, #b45309)', margin: '4px 0 0' }}>
              {t('Seu modelo atual não está na lista liberada; o padrão do administrador será usado.')}
            </p>
          )}
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
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={savedKey ? 'Chave salva — clique no olho para ver' : 'sk-or-v1-...'}
                />
                <button className="btn btn-ghost" onClick={revealKey} title={showKey ? 'Ocultar chave' : 'Mostrar chave'}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  className={dirty ? 'btn btn-primary' : 'btn btn-secondary'}
                  disabled={!dirty || saving}
                  onClick={() => onSave({ own_api_key: apiKey.trim() })}
                  style={dirty ? { gap: 6 } : { gap: 6, color: '#059669' }}
                >
                  {dirty ? t('Salvar chave') : <><Check size={14} />{t('Salvo!')}</>}
                </button>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                {t('A chave é da sua empresa e nunca é exibida para o administrador da plataforma.')}
              </p>
            </>
          )}
        </div>

        {/* Consumo — global (com limite) ou próprio (sem limite, com custo e saldo) */}
        {!usesPlatformToken ? (
          <div style={{
            padding: '12px 16px', borderRadius: 10, background: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Coins size={14} color="var(--primary)" />
                {t('Consumo com seu próprio token este mês')}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                {usageTokens.toLocaleString('pt-BR')} tokens
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wallet size={13} />
                {t('Custo estimado')}: <strong style={{ color: 'var(--text-primary)' }}>R$ {usageCost.toFixed(2)}</strong>
              </span>
              <span>
                {t('Saldo OpenRouter')}:{' '}
                {creditsLoading ? '…' : credits?.totalCredits != null
                  ? <strong style={{ color: 'var(--text-primary)' }}>R$ {(credits.totalCredits - (credits.totalUsage ?? 0)).toFixed(2)}</strong>
                  : '—'}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="form-label">{t('Consumo de tokens este mês (token da plataforma)')}</label>
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
        )}

        {(saving || saved) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: saved ? '#16a34a' : 'var(--text-muted)' }}>
            {saved ? <><Check size={14} /> {t('Configurações salvas!')}</> : t('Salvando...')}
          </div>
        )}
      </div>
    </div>
  );
};
