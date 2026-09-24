import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Check, Upload, Trash2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTranslation } from '@/hooks/useTranslation';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';

const PRESET_COLORS = [
  '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#d97706', '#16a34a', '#0d9488', '#0891b2',
  '#475569', '#0f172a',
];

interface OwnTheme {
  primary_color: string | null;
  logo_url: string | null;
  logo_type: 'icon' | 'full';
  favicon_url: string | null;
}

const EMPTY_OWN: OwnTheme = { primary_color: null, logo_url: null, logo_type: 'icon', favicon_url: null };

export const AppearanceSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { globalTheme, setTenantTheme, applyTheme } = useThemeStore();
  const tenantId = user?.tenantId ?? '';

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [own, setOwn] = useState<OwnTheme>(EMPTY_OWN);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const preview = {
    color: own.primary_color ?? globalTheme.primaryColor,
    logoUrl: own.logo_url ?? globalTheme.logoUrl,
    logoType: own.logo_url ? own.logo_type : globalTheme.logoType,
    logoText: globalTheme.logoText,
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: tenant }, ownRes] = await Promise.all([
          supabase.from('tenants').select('plan_id').eq('id', tenantId).maybeSingle(),
          supabase.from('tenant_themes').select('primary_color, logo_url, logo_type, favicon_url').eq('tenant_id', tenantId).maybeSingle(),
        ]);
        if (tenant?.plan_id) {
          const { data: plan } = await supabase.from('plans').select('custom_branding').eq('id', tenant.plan_id).maybeSingle();
          setAllowed(plan?.custom_branding === true);
        } else {
          setAllowed(false);
        }
        if (ownRes.data) {
          setOwn({
            primary_color: ownRes.data.primary_color ?? null,
            logo_url: ownRes.data.logo_url ?? null,
            logo_type: (ownRes.data.logo_type as 'icon' | 'full') ?? 'icon',
            favicon_url: ownRes.data.favicon_url ?? null,
          });
        }
      } catch (err) {
        console.error('Failed to load appearance config:', err);
        setError('Erro ao carregar aparência');
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) load();
  }, [tenantId]);

  // Preview ao vivo: sincroniza com o store (que já faz fallback pro global)
  const pushPreview = useCallback((next: OwnTheme) => {
    setTenantTheme(tenantId, {
      primaryColor: next.primary_color ?? globalTheme.primaryColor,
      primaryDark: next.primary_color ?? globalTheme.primaryColor,
      logoUrl: next.logo_url ?? globalTheme.logoUrl,
      logoType: (next.logo_url ? next.logo_type : globalTheme.logoType) as 'icon' | 'full',
    });
    applyTheme(tenantId);
  }, [tenantId, globalTheme, setTenantTheme, applyTheme]);

  const updateOwn = (patch: Partial<OwnTheme>) => {
    const next = { ...own, ...patch };
    setOwn(next);
    pushPreview(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: upsertError } = await supabase
        .from('tenant_themes')
        .upsert({
          tenant_id: tenantId,
          primary_color: own.primary_color,
          primary_dark: own.primary_color,
          logo_url: own.logo_url,
          logo_type: own.logo_url ? own.logo_type : null,
          logo_text: null,
          favicon_url: own.favicon_url,
          sidebar_dark: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });
      if (upsertError) throw upsertError;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save appearance:', err);
    } finally {
      setSaving(false);
    }
  };

  const readImage = (file: File, cb: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (ev) => cb(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (error) return <ErrorMessage message={error} onRetry={() => setError(null)} />;
  if (loading || allowed === null) return <SkeletonCard />;

  if (!allowed) {
    return (
      <div className="card card-p">
        <div className="empty-state">
          <div className="empty-state-icon"><Lock size={24} /></div>
          <p className="empty-state-title">{t('Personalização de marca')}</p>
          <p className="empty-state-desc">
            {t('Esta funcionalidade está disponível apenas em planos superiores. Fale com o suporte para habilitar a logo e as cores próprias da sua empresa.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Aparência')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Cores e logos da sua empresa. O que não for configurado usa o padrão da plataforma.')}
        </p>
      </div>

      {/* Cor */}
      <div className="form-group">
        <label className="form-label">{t('Cor primária')}</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          {PRESET_COLORS.map(c => (
            <div
              key={c}
              onClick={() => updateOwn({ primary_color: c })}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: c, cursor: 'pointer',
                border: preview.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                transition: 'transform 0.1s, border 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: preview.color === c ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {preview.color === c && <Check size={14} color="#fff" />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 320 }}>
          <input
            type="color"
            value={preview.color}
            onChange={e => updateOwn({ primary_color: e.target.value })}
            style={{ width: 42, height: 38, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
          />
          <input className="input" value={preview.color} onChange={e => updateOwn({ primary_color: e.target.value })} placeholder="#4f46e5" />
          {own.primary_color && (
            <button className="btn btn-ghost btn-sm" onClick={() => updateOwn({ primary_color: null })} title={t('Usar cor da plataforma')}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="form-group">
        <label className="form-label">{t('Logo da empresa')}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: own.logo_url ? 'transparent' : 'var(--primary-light)' }}>
            {preview.logoUrl ? (
              <img src={preview.logoUrl} alt={preview.logoText} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>{(preview.logoText || 'C').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImage(file, (dataUrl) => updateOwn({ logo_url: dataUrl }));
                if (logoInputRef.current) logoInputRef.current.value = '';
              }}
            />
            <button className="btn btn-secondary btn-sm" onClick={() => logoInputRef.current?.click()}>
              <Upload size={14} />{own.logo_url ? t('Trocar logo') : t('Enviar logo')}
            </button>
            {own.logo_url && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="select"
                  style={{ width: 140 }}
                  value={own.logo_type}
                  onChange={e => updateOwn({ logo_type: e.target.value as 'icon' | 'full' })}
                >
                  <option value="icon">{t('Ícone')}</option>
                  <option value="full">{t('Completo')}</option>
                </select>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOwn({ logo_url: null })}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="form-group">
        <label className="form-label">{t('Ícone (favicon)')}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {own.favicon_url ? (
              <img src={own.favicon_url} alt="favicon" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('Padrão da plataforma')}</span>
            )}
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readImage(file, (dataUrl) => updateOwn({ favicon_url: dataUrl }));
              if (faviconInputRef.current) faviconInputRef.current.value = '';
            }}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => faviconInputRef.current?.click()}>
            <Upload size={14} />{own.favicon_url ? t('Trocar ícone') : t('Enviar ícone')}
          </button>
          {own.favicon_url && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOwn({ favicon_url: null })}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? <><Check size={15} />{t('Salvo!')}</> : saving ? t('Salvando...') : t('Salvar aparência')}
        </button>
      </div>
    </div>
  );
};
