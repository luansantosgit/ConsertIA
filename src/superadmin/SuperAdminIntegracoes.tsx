import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Loader2, Check, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const WEBHOOK_URL_UAZAPI = `${SUPABASE_URL}/functions/v1/uazapi-direct`;
const WEBHOOK_URL_BSP = `${SUPABASE_URL}/functions/v1/whatsapp-bsp-webhook`;

interface PlatformSettings {
  id?: string;
  admin_api_token: string;
  uazapi_subdomain: string;
  webhook_url: string;
  bsp_username: string;
  bsp_password: string;
  bsp_webhook_url: string;
}

const defaultSettings: PlatformSettings = {
  admin_api_token: '', uazapi_subdomain: 'api',
  webhook_url: WEBHOOK_URL_UAZAPI,
  bsp_username: '', bsp_password: '',
  bsp_webhook_url: WEBHOOK_URL_BSP,
};

export const SuperAdminIntegracoes: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showBspPassword, setShowBspPassword] = useState(false);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'uazapi' | 'bsp'>('uazapi');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) {
          setSettings({
            id: data.id,
            admin_api_token: data.admin_api_token || '',
            uazapi_subdomain: data.uazapi_subdomain || 'api',
            webhook_url: data.webhook_url || WEBHOOK_URL_UAZAPI,
            bsp_username: data.bsp_username || '',
            bsp_password: data.bsp_password || '',
            bsp_webhook_url: data.bsp_webhook_url || WEBHOOK_URL_BSP,
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...data } = settings;
      if (id) {
        await supabase.from('platform_settings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      } else {
        await supabase.from('platform_settings').insert(data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const update = (patch: Partial<PlatformSettings>) => setSettings(p => ({ ...p, ...patch }));

  if (loading) {
    return <div className="page"><div className="card card-p"><div className="skeleton" style={{ height: 200 }} /></div></div>;
  }

  return (
    <div className="page" style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Integrações WhatsApp</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Configure as credenciais da API Alternativa e API Oficial.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-secondary)', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'uazapi' as const, label: 'API Alternativa (Uazapi)' },
          { key: 'bsp' as const, label: 'API Oficial (BSP Pontaltech)' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* API Alternativa */}
      {activeTab === 'uazapi' && (
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>API Alternativa — Uazapi</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Credenciais para envio/recebimento de mensagens via WhatsApp não oficial.
            </p>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Admin Token</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showToken ? 'text' : 'password'}
                  value={settings.admin_api_token}
                  onChange={e => update({ admin_api_token: e.target.value })}
                  placeholder="Token de administrador Uazapi"
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
              <label className="form-label">Subdomínio</label>
              <input
                className="input"
                value={settings.uazapi_subdomain}
                onChange={e => update({ uazapi_subdomain: e.target.value })}
                placeholder="api"
              />
            </div>
          </div>

          <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>WEBHOOK URL (Recebimento de mensagens)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                value={settings.webhook_url}
                onChange={e => update({ webhook_url: e.target.value })}
                placeholder="https://sua-app.supabase.co/functions/v1/uazapi-webhook"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => handleCopy('uazapi_wh', settings.webhook_url)}>
                <Copy size={14} /> {copied['uazapi_wh'] ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Esta URL e configurada automaticamente nas instancias ao conectar. Eventos: messages, messages_update, connection.
            </p>
          </div>

          <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: '0.8125rem', color: '#166534' }}>
              <strong>Base URL:</strong> https://{settings.uazapi_subdomain || 'api'}.uazapi.com
            </p>
            <p style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4 }}>
              Endpoints principais: <code>/instance/create</code>, <code>/instance/connect</code>, <code>/send/text</code>, <code>/send/media</code>
            </p>
          </div>
        </div>
      )}

      {/* API Oficial BSP */}
      {activeTab === 'bsp' && (
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>API Oficial — BSP Pontaltech</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Credenciais para envio/recebimento via Meta WhatsApp Cloud API.
            </p>
          </div>

          <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '0.8125rem', color: '#1e40af' }}>
              O WABA ID e Phone Number ID são preenchidos por cada empresa ao conectar um canal oficial. Não são configurados aqui.
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username (NewPointer)</label>
              <input className="input" value={settings.bsp_username} onChange={e => update({ bsp_username: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showBspPassword ? 'text' : 'password'}
                  value={settings.bsp_password}
                  onChange={e => update({ bsp_password: e.target.value })}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowBspPassword(!showBspPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showBspPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Webhook URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="input" value={settings.bsp_webhook_url} onChange={e => update({ bsp_webhook_url: e.target.value })} style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => handleCopy('bsp_wh', settings.bsp_webhook_url)}>
                <Copy size={14} /> {copied['bsp_wh'] ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>BASE URLs</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              <span>Auth + Messages: https://whatsapp-auth.pontaltech.com.br</span>
              <span>Media Upload: https://whatsapp-media-api.pontaltech.com.br</span>
              <span>Analytics: https://pontaltech-whatsapp-analytics.pontaltech.com.br</span>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
          {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
};
