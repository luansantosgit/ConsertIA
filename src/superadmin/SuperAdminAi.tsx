import React, { useState, useEffect, useCallback } from 'react';
import { Save, Eye, EyeOff, Bot, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { OPENROUTER_MODELS, modelLabel } from '@/lib/openrouter-models';

interface TenantRow { id: string; name: string; plan_id: string | null }
interface PlanRow { id: string; name: string; ai_token_limit: number }
interface EntitlementRow { tenant_id: string; use_platform_token: boolean; token_limit_override: number | null; allowed_models?: string[] | null; default_model?: string | null }
interface UsageRow { tenant_id: string; tokens_in: number; tokens_out: number }

export const SuperAdminAi: React.FC = () => {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, EntitlementRow>>({});  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const period = new Date().toISOString().slice(0, 7);
      const [cfg, tenantRows, planRows, entRows, usageRows] = await Promise.all([
        supabase.from('platform_ai_config').select('*').limit(1).maybeSingle(),
        supabase.from('tenants').select('id, name, plan_id').order('name'),
        supabase.from('plans').select('id, name, ai_token_limit'),
        supabase.from('tenant_ai_entitlements').select('tenant_id, use_platform_token, token_limit_override, allowed_models, default_model'),
        supabase.from('ai_token_usage').select('tenant_id, tokens_in, tokens_out').eq('period', period),
      ]);
      if (cfg.data) {
        setToken(cfg.data.openrouter_token ?? '');
        setMode(cfg.data.distribution_mode ?? 'selected');
      }
      setTenants(tenantRows.data ?? []);
      setPlans(planRows.data ?? []);
      const entMap: Record<string, EntitlementRow> = {};
      for (const row of (entRows.data ?? []) as EntitlementRow[]) entMap[row.tenant_id] = row;
      setEntitlements(entMap);
      const usageMap: Record<string, number> = {};
      for (const row of (usageRows.data ?? []) as UsageRow[]) usageMap[row.tenant_id] = row.tokens_in + row.tokens_out;
      setUsage(usageMap);
    } catch (err) {
      console.error('Failed to load AI provider config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('platform_ai_config').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        await supabase.from('platform_ai_config').update({
          openrouter_token: token, distribution_mode: mode, updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('platform_ai_config').insert({ openrouter_token: token, distribution_mode: mode });
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      console.error('Failed to save AI provider config:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTenantToken = async (tenantId: string, next: boolean) => {
    try {
      const { error } = await supabase
        .from('tenant_ai_entitlements')
        .upsert({ tenant_id: tenantId, use_platform_token: next }, { onConflict: 'tenant_id' });
      if (error) throw error;
      setEntitlements(prev => ({ ...prev, [tenantId]: { tenant_id: tenantId, use_platform_token: next, token_limit_override: prev[tenantId]?.token_limit_override ?? null } }));
    } catch (err) {
      console.error('Failed to toggle entitlement:', err);
    }
  };

  const setOverride = async (tenantId: string, value: string) => {
    const parsed = value === '' ? null : Number(value);
    if (parsed !== null && !Number.isFinite(parsed)) return;
    try {
      const { error } = await supabase
        .from('tenant_ai_entitlements')
        .upsert({
          tenant_id: tenantId,
          use_platform_token: entitlements[tenantId]?.use_platform_token ?? false,
          token_limit_override: parsed,
        }, { onConflict: 'tenant_id' });
      if (error) throw error;
      setEntitlements(prev => ({ ...prev, [tenantId]: { tenant_id: tenantId, use_platform_token: prev[tenantId]?.use_platform_token ?? false, token_limit_override: parsed } }));
    } catch (err) {
      console.error('Failed to set override:', err);
    }
  };

  const planLimit = (tenant: TenantRow) => plans.find(p => p.id === tenant.plan_id)?.ai_token_limit ?? 0;
  const effectiveLimit = (tenant: TenantRow) => {
    const ent = entitlements[tenant.id];
    return ent?.token_limit_override ?? planLimit(tenant);
  };

  // ── Modelos permitidos/padrão (aplicam quando a empresa usa o token global) ──
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [draftAllowed, setDraftAllowed] = useState<string[]>([]);
  const [draftDefault, setDraftDefault] = useState('');

  const openModels = (tenantId: string) => {
    const ent = entitlements[tenantId];
    const allowed = (ent?.allowed_models ?? []) as string[];
    setDraftAllowed(allowed);
    setDraftDefault(ent?.default_model ?? (allowed[0] ?? ''));
    setExpandedTenant(prev => prev === tenantId ? null : tenantId);
  };

  const toggleModel = (id: string) => {
    setDraftAllowed(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    setDraftDefault(prev => (draftAllowed.includes(id) && prev === id) ? '' : prev);
  };

  const saveModels = async (tenantId: string) => {
    const allowed = draftAllowed.length > 0 ? draftAllowed : null;
    const defaultModel = allowed ? (draftDefault && allowed.includes(draftDefault) ? draftDefault : allowed[0]) : null;
    try {
      const { error } = await supabase
        .from('tenant_ai_entitlements')
        .upsert({
          tenant_id: tenantId,
          use_platform_token: entitlements[tenantId]?.use_platform_token ?? false,
          allowed_models: allowed,
          default_model: defaultModel,
        }, { onConflict: 'tenant_id' });
      if (error) throw error;
      setEntitlements(prev => ({
        ...prev,
        [tenantId]: { ...prev[tenantId], tenant_id: tenantId, allowed_models: allowed, default_model: defaultModel },
      }));
      setExpandedTenant(null);
    } catch (err) {
      console.error('Failed to save allowed models:', err);
    }
  };

  if (loading) {
    return <div className="page"><div className="card card-p"><div className="skeleton" style={{ height: 120 }} /></div></div>;
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} color="var(--primary)" /> {t('Provedor de IA (OpenRouter)')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {t('Token central da plataforma e distribuição de uso entre as empresas.')}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">{t('Token OpenRouter da plataforma')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input" type={showToken ? 'text' : 'password'}
              value={token} onChange={e => setToken(e.target.value)} placeholder="sk-or-v1-..."
            />
            <button className="btn btn-ghost" onClick={() => setShowToken(v => !v)}>
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
              <Save size={15} /> {t('Salvar')}
            </button>
            {savedFlash && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: '0.8125rem' }}><Check size={14} /> {t('Salvo!')}</span>}
          </div>
        </div>

        <div>
          <label className="form-label">{t('Quem pode usar o token da plataforma')}</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['all', 'selected'] as const).map(value => (
              <button
                key={value}
                type="button"
                className={`btn ${mode === value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode(value)}
              >
                {value === 'all' ? t('Todas as empresas (limite do plano)') : t('Somente empresas selecionadas')}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {t('Empresas sem acesso ao token central usam a própria chave OpenRouter no painel delas (Agente de IA > Integrações).')}
          </p>
        </div>
      </div>

      <div className="card card-p">
        <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 14' }}>{t('Empresas e consumo do mês')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map(tenant => {
            const ent = entitlements[tenant.id];
            const usesToken = ent?.use_platform_token !== false;
            const limit = effectiveLimit(tenant);
            const used = usage[tenant.id] ?? 0;
            const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const planName = plans.find(p => p.id === tenant.plan_id)?.name ?? '—';
            return (
              <div key={tenant.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                border: '1px solid var(--border)', borderRadius: 10, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.875rem' }}>{tenant.name}</strong>
                  <span className="badge badge-secondary" style={{ marginLeft: 8 }}>{planName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-secondary, #e5e7eb)' }}>
                      <div style={{
                        width: `${percent}%`, height: '100%', borderRadius: 99,
                        background: percent >= 90 ? 'var(--danger)' : 'var(--primary)',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {used.toLocaleString('pt-BR')} {limit > 0 ? `/ ${limit.toLocaleString('pt-BR')} tokens` : 'tokens'}
                    </span>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox" checked={usesToken}
                    onChange={e => toggleTenantToken(tenant.id, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  {t('Token da plataforma')}
                </label>
                <input
                  className="input" type="number" style={{ maxWidth: 120 }}
                  placeholder={t('Limite extra')}
                  defaultValue={ent?.token_limit_override ?? ''}
                  onBlur={e => { if (e.target.value !== String(ent?.token_limit_override ?? '')) setOverride(tenant.id, e.target.value); }}
                />

              {usesToken && (
                <div style={{
                  marginTop: 10, padding: '12px 14px', borderRadius: 10,
                  background: '#f8fafc', border: '1px dashed var(--border)', flexBasis: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ fontSize: '0.8125rem' }}>{t('Modelos permitidos (token global)')}</strong>
                    <button className="btn btn-secondary btn-sm" onClick={() => openModels(tenant.id)}>
                      {expandedTenant === tenant.id ? t('Cancelar') : `${t('Editar')} (${(ent?.allowed_models ?? []).length})`}
                    </button>
                  </div>
                  {expandedTenant !== tenant.id ? (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ent?.allowed_models?.length
                        ? `${ent.allowed_models.map(m => modelLabel(m)).join(' · ')} — ${t('Padrão')}: ${modelLabel(ent.default_model ?? ent.allowed_models[0])}`
                        : t('Todos os modelos liberados (o admin da empresa escolhe livremente).')}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 6 }}>
                        {OPENROUTER_MODELS.map(m => (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox" checked={draftAllowed.includes(m.id)}
                              onChange={() => toggleModel(m.id)}
                              style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
                            />
                            {m.label}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.75rem' }}>{t('Modelo padrão')}</label>
                        <select
                          className="select" style={{ maxWidth: 260 }}
                          value={draftDefault}
                          onChange={e => setDraftDefault(e.target.value)}
                        >
                          {draftAllowed.map(id => (
                            <option key={id} value={id}>{modelLabel(id)}</option>
                          ))}
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={() => saveModels(tenant.id)} disabled={draftAllowed.length === 0}>
                          <Save size={13} /> {t('Salvar')}
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {t('Sem seleção = todos os modelos liberados. O padrão entra quando a empresa não escolher nenhum.')}
                      </p>
                    </div>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
