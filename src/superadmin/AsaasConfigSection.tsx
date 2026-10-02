import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Check, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const WEBHOOK_URL_ASAAS = `${SUPABASE_URL}/functions/v1/asaas-webhook`;

const METHODS = [
  { key: 'PIX', label: 'Pix' },
  { key: 'BOLETO', label: 'Boleto bancário' },
  { key: 'CREDIT_CARD', label: 'Cartão de crédito' },
];

interface AsaasConfig {
  id?: string;
  access_token: string;
  environment: 'sandbox' | 'production';
  enabled_methods: string[];
  subscription_grace_days: number;
  onboarding_enabled_methods: string[] | null;
}

const defaultConfig: AsaasConfig = {
  access_token: '',
  environment: 'sandbox',
  enabled_methods: ['PIX', 'BOLETO', 'CREDIT_CARD'],
  subscription_grace_days: 7,
  onboarding_enabled_methods: null,
};

// Credenciais globais do gateway Asaas (assinaturas dos tenants).
// Token fica em asaas_config — legível apenas por superadmin.
export const AsaasConfigSection: React.FC = () => {
  const [config, setConfig] = useState<AsaasConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('asaas_config')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) {
          setConfig({
            id: data.id,
            access_token: data.access_token || '',
            environment: data.environment || 'sandbox',
            enabled_methods: data.enabled_methods ?? ['PIX', 'BOLETO', 'CREDIT_CARD'],
            subscription_grace_days: data.subscription_grace_days ?? 7,
            onboarding_enabled_methods: data.onboarding_enabled_methods ?? null,
          });
        }
      } catch (err) {
        console.error('Failed to load asaas config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...data } = config;
      if (id) {
        await supabase.from('asaas_config').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      } else {
        await supabase.from('asaas_config').insert(data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save asaas config:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = (key: string, field: 'enabled_methods' | 'onboarding_enabled_methods') => {
    setConfig(prev => {
      if (field === 'enabled_methods') {
        return {
          ...prev,
          enabled_methods: prev.enabled_methods.includes(key)
            ? prev.enabled_methods.filter(m => m !== key)
            : [...prev.enabled_methods, key],
        };
      }
      const current = prev.onboarding_enabled_methods ?? [];
      return {
        ...prev,
        onboarding_enabled_methods: current.includes(key)
          ? current.filter(m => m !== key)
          : [...current, key],
      };
    });
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL_ASAAS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="card card-p"><div className="skeleton" style={{ height: 200 }} /></div>;
  }

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Assinaturas — Asaas</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Gateway de pagamento das assinaturas dos planos. As formas liberadas aqui são as únicas
          oferecidas às empresas no menu Assinatura.
        </p>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">API Key do Asaas</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showToken ? 'text' : 'password'}
              value={config.access_token}
              onChange={e => setConfig(p => ({ ...p, access_token: e.target.value }))}
              placeholder="$aac_... (sandbox) ou $aa_... (produção)"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Ambiente</label>
          <select
            className="select"
            value={config.environment}
            onChange={e => setConfig(p => ({ ...p, environment: e.target.value as 'sandbox' | 'production' }))}
          >
            <option value="sandbox">Sandbox (testes)</option>
            <option value="production">Produção</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Carência global (dias após o vencimento)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={config.subscription_grace_days}
            onChange={e => setConfig(p => ({ ...p, subscription_grace_days: Number(e.target.value) }))}
          />
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Após este prazo o sistema da empresa bloqueia na página Assinatura e o agente de IA para de responder.
            Prazos extras por empresa podem ser concedidos no cadastro da empresa.
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Formas de pagamento liberadas (globais)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {METHODS.map(m => (
            <label
              key={m.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 14px', borderRadius: 99,
                border: `1px solid ${config.enabled_methods.includes(m.key) ? 'var(--primary)' : 'var(--border)'}`,
                background: config.enabled_methods.includes(m.key) ? 'var(--primary-light)' : 'transparent',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <input
                type="checkbox"
                checked={config.enabled_methods.includes(m.key)}
                onChange={() => toggleMethod(m.key, 'enabled_methods')}
                style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Formas de pagamento no wizard de cadastro (/comece-agora)
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {METHODS.map(m => {
            const active = (config.onboarding_enabled_methods ?? []).includes(m.key);
            return (
              <label
                key={m.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 99,
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'var(--primary-light)' : 'transparent',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleMethod(m.key, 'onboarding_enabled_methods')}
                  style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</span>
              </label>
            );
          })}
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
          Definidas separadamente das formas globais. Nenhuma marcada = usa as formas globais.
        </p>
      </div>

      <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          WEBHOOK URL (eventos de pagamento — configure no painel do Asaas)
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="input" readOnly value={WEBHOOK_URL_ASAAS} style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          <button className="btn btn-ghost btn-sm" onClick={copyWebhook}>
            <Copy size={14} /> {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
          Cadastre esta URL em Asaas → Conta → Webhooks, habilitando os eventos de cobrança (PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc).
        </p>
      </div>

      <div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || config.enabled_methods.length === 0}>
          {saved ? <><Check size={15} /> Salvo!</> : <><Save size={15} /> Salvar configuração</>}
        </button>
      </div>
    </div>
  );
};
