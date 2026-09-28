import React, { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';
import { Palette, Upload, Check, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PRESET_COLORS = [
  { name: 'Azul', color: '#2563eb' },
  { name: 'Índigo', color: '#4f46e5' },
  { name: 'Roxo', color: '#7c3aed' },
  { name: 'Rosa', color: '#db2777' },
  { name: 'Vermelho', color: '#dc2626' },
  { name: 'Laranja', color: '#ea580c' },
  { name: 'Âmbar', color: '#d97706' },
  { name: 'Verde', color: '#16a34a' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Ciano', color: '#0891b2' },
  { name: 'Slate', color: '#475569' },
  { name: 'Preto', color: '#0f172a' },
];

export const SuperAdminTheme: React.FC = () => {
  const { globalTheme, tenantThemes, setGlobalTheme, setTenantTheme, applyTheme, loadGlobalTheme } = useThemeStore();
  const [selectedTenant, setSelectedTenant] = useState<string>('global');
  const [saved, setSaved] = useState(false);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase.from('tenants').select('id, name').order('name');
      if (data) setTenants(data);
    };
    fetchTenants();
    loadGlobalTheme();
  }, [loadGlobalTheme]);

  useEffect(() => {
    if (selectedTenant === 'global') return;
    const fetchTheme = async () => {
      const { data } = await supabase
        .from('tenant_themes')
        .select('*')
        .eq('tenant_id', selectedTenant)
        .maybeSingle();
      if (data) {
        setTenantTheme(selectedTenant, {
          tenantId: selectedTenant,
          primaryColor: data.primary_color || globalTheme.primaryColor,
          primaryDark: data.primary_dark || data.primary_color || globalTheme.primaryDark,
          logoUrl: data.logo_url ?? globalTheme.logoUrl,
          logoType: (data.logo_type as 'icon' | 'full') ?? globalTheme.logoType ?? 'icon',
          logoText: data.logo_text || globalTheme.logoText,
          faviconUrl: data.favicon_url ?? globalTheme.faviconUrl,
          sidebarDark: data.sidebar_dark ?? false,
        });
      }
    };
    fetchTheme();
  }, [selectedTenant]);

  const currentTheme =
    selectedTenant === 'global'
      ? globalTheme
      : tenantThemes[selectedTenant] || globalTheme;

  const updateTheme = (patch: Record<string, string | boolean | null>) => {
    if (selectedTenant === 'global') {
      setGlobalTheme(patch);
    } else {
      setTenantTheme(selectedTenant, { ...patch, tenantId: selectedTenant });
    }
  };

  const handleSave = async () => {
    try {
      if (selectedTenant === 'global') {
        const payload = {
          primary_color: currentTheme.primaryColor,
          primary_dark: currentTheme.primaryDark || currentTheme.primaryColor,
          logo_url: currentTheme.logoUrl || null,
          logo_type: currentTheme.logoType || 'icon',
          logo_text: currentTheme.logoText || 'DeeperIA',
          favicon_url: currentTheme.faviconUrl || null,
          sidebar_dark: currentTheme.sidebarDark || false,
          updated_at: new Date().toISOString(),
        };
        for (const t of tenants) {
          await supabase
            .from('tenant_themes')
            .upsert({ ...payload, tenant_id: t.id }, { onConflict: 'tenant_id' });
        }
        await supabase
          .from('global_settings')
          .update({ theme: payload, updated_at: new Date().toISOString() })
          .eq('id', '00000000-0000-0000-0000-000000000001');
        applyTheme();
      } else {
        const payload = {
          tenant_id: selectedTenant,
          primary_color: currentTheme.primaryColor,
          primary_dark: currentTheme.primaryDark || currentTheme.primaryColor,
          logo_url: currentTheme.logoUrl || null,
          logo_type: currentTheme.logoType || 'icon',
          logo_text: currentTheme.logoText || 'DeeperIA',
          favicon_url: currentTheme.faviconUrl || null,
          sidebar_dark: currentTheme.sidebarDark || false,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('tenant_themes')
          .upsert(payload, { onConflict: 'tenant_id' });
        if (error) {
          console.error('Failed to save tenant theme:', error);
        }
        applyTheme(selectedTenant);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'full') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateTheme({ logoUrl: ev.target?.result as string, logoType: type });
    };
    reader.readAsDataURL(file);
    // limpa o input para permitir reupar o mesmo arquivo
    e.target.value = '';
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateTheme({ faviconUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Temas & Marcas</h1>
          <p className="page-subtitle">Personalize cores, logo e favicon por empresa</p>
        </div>
        <button
          className="btn"
          onClick={handleSave}
          style={{
            background: saved ? 'var(--success)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', border: 'none',
            transition: 'background 0.3s',
          }}
        >
          {saved ? <><Check size={16} /> Salvo!</> : <><Palette size={16} /> Aplicar tema</>}
        </button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tenant selector */}
          <div className="card card-p">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Escopo do tema</h3>
            <div className="form-group">
              <label className="form-label">Aplicar para</label>
              <select
                className="select"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
              >
                <option value="global">🌐 Global (padrão da plataforma)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>🏢 {t.name}</option>
                ))}
              </select>
            </div>
            <p className="form-hint" style={{ marginTop: 8 }}>
              {selectedTenant === 'global'
                ? 'Afeta todas as empresas que não possuem tema próprio'
                : 'Afeta somente esta empresa (sobrescreve o tema global)'}
            </p>
          </div>

          {/* Color */}
          <div className="card card-p">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Cor primária</h3>
            <div className="color-swatch-grid" style={{ marginBottom: 16 }}>
              {PRESET_COLORS.map((c) => (
                <div
                  key={c.color}
                  className={`color-swatch ${currentTheme.primaryColor === c.color ? 'selected' : ''}`}
                  style={{ background: c.color }}
                  title={c.name}
                  onClick={() => updateTheme({ primaryColor: c.color, primaryDark: c.color })}
                />
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Cor customizada</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={currentTheme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value, primaryDark: e.target.value })}
                  style={{ width: 42, height: 38, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                />
                <input
                  className="input"
                  value={currentTheme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value, primaryDark: e.target.value })}
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="card card-p">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Logo</h3>
            <div className="form-group">
              <label className="form-label">Nome da marca (exibido na sidebar)</label>
              <input
                className="input"
                value={currentTheme.logoText}
                onChange={(e) => updateTheme({ logoText: e.target.value })}
                placeholder="DeeperIA"
              />
            </div>

            {/* Tipo de logo atual */}
            {currentTheme.logoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 4px' }}>
                <img src={currentTheme.logoUrl} alt="Logo" style={{ height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', padding: 4, background: '#f8fafc' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {currentTheme.logoType === 'full' ? '📐 Logo completo (ícone + nome)' : '🔷 Somente ícone'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {currentTheme.logoType === 'full'
                      ? 'A imagem é exibida sem o nome do sistema ao lado'
                      : 'O ícone é exibido sem fundo colorido'}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', flexShrink: 0 }}
                  onClick={() => updateTheme({ logoUrl: null, logoType: 'icon' })}
                >
                  Remover
                </button>
              </div>
            )}

            {/* Opção 1: Somente ícone */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>🔷</span> Opção 1 — Somente ícone
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                O ícone é exibido sem fundo colorido. O nome do sistema continua aparecendo ao lado.
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px', border: `2px dashed ${currentTheme.logoType === 'icon' && currentTheme.logoUrl ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                transition: 'border-color 0.15s', fontSize: '0.875rem', color: 'var(--text-muted)',
                background: currentTheme.logoType === 'icon' && currentTheme.logoUrl ? 'var(--primary-light)' : 'transparent',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = currentTheme.logoType === 'icon' && currentTheme.logoUrl ? 'var(--primary)' : 'var(--border)')}
              >
                <Upload size={16} />
                {currentTheme.logoType === 'icon' && currentTheme.logoUrl ? '✓ Ícone carregado — clique para trocar' : 'Upload de ícone (PNG/SVG)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoUpload(e, 'icon')} />
              </label>
            </div>

            {/* Opção 2: Logo completo */}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>📐</span> Opção 2 — Logo completo (ícone + nome)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                A imagem já contém ícone e nome. O sistema exibe somente a imagem, sem nome ao lado.
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px', border: `2px dashed ${currentTheme.logoType === 'full' && currentTheme.logoUrl ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                transition: 'border-color 0.15s', fontSize: '0.875rem', color: 'var(--text-muted)',
                background: currentTheme.logoType === 'full' && currentTheme.logoUrl ? 'var(--primary-light)' : 'transparent',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = currentTheme.logoType === 'full' && currentTheme.logoUrl ? 'var(--primary)' : 'var(--border)')}
              >
                <Upload size={16} />
                {currentTheme.logoType === 'full' && currentTheme.logoUrl ? '✓ Logo completo carregado — clique para trocar' : 'Upload de logo completo (PNG/SVG)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoUpload(e, 'full')} />
              </label>
            </div>
          </div>

          {/* Favicon */}
          <div className="card card-p">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Favicon</h3>
            <p className="form-hint" style={{ marginBottom: 12 }}>
              Se não definido, será gerado automaticamente com a cor primária e a inicial do nome.
            </p>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '14px', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'border-color 0.15s',
              fontSize: '0.875rem', color: 'var(--text-muted)',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Upload size={18} />
              {currentTheme.faviconUrl ? 'Favicon carregado — clique para trocar' : 'Upload de favicon (ICO/PNG)'}
              <input type="file" accept="image/*,.ico" style={{ display: 'none' }} onChange={handleFaviconUpload} />
            </label>
            {currentTheme.faviconUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <img src={currentTheme.faviconUrl} alt="Favicon" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} />
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => updateTheme({ faviconUrl: null })}
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
          <div className="card card-p">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Eye size={16} color="var(--text-muted)" />
              <h3 className="card-title">Preview em tempo real</h3>
            </div>

            {/* Sidebar preview */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              overflow: 'hidden', height: 340, display: 'flex', boxShadow: 'var(--card-shadow)',
            }}>
              {/* Mini sidebar */}
              <div style={{
                width: 140, background: '#0f172a', display: 'flex',
                flexDirection: 'column', padding: '12px 8px', gap: 3,
              }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', marginBottom: 12 }}>
                  {currentTheme.logoUrl && currentTheme.logoType === 'full' ? (
                    /* Logo completo: imagem sem fundo, sem nome */
                    <img src={currentTheme.logoUrl} style={{ height: 22, maxWidth: 110, objectFit: 'contain' }} />
                  ) : (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: currentTheme.logoUrl ? 'transparent' : currentTheme.primaryColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.6875rem', fontWeight: 800, flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {currentTheme.logoUrl
                          ? <img src={currentTheme.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : currentTheme.logoText.charAt(0)
                        }
                      </div>
                      <span style={{ color: '#fff', fontSize: '0.6875rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentTheme.logoText}
                      </span>
                    </>
                  )}
                </div>
                {/* Menu items */}
                {['Dashboard', 'Atendimento', 'OS', 'Clientes', 'Estoque'].map((item, i) => (
                  <div key={item} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 8px', borderRadius: 5,
                    background: i === 0 ? currentTheme.primaryColor + '30' : 'transparent',
                    borderLeft: i === 0 ? `2px solid ${currentTheme.primaryColor}` : '2px solid transparent',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? currentTheme.primaryColor : 'rgba(255,255,255,0.2)' }} />
                    <span style={{ fontSize: '0.625rem', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Content area */}
              <div style={{ flex: 1, background: '#f1f5f9', padding: '10px' }}>
                {/* Header */}
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0f172a' }}>Dashboard</span>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: currentTheme.primaryColor }} />
                </div>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 6, padding: '8px', height: 44 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: currentTheme.primaryColor + '20', marginBottom: 4 }} />
                      <div style={{ height: 4, borderRadius: 99, background: '#f1f5f9', width: '60%' }} />
                    </div>
                  ))}
                </div>
                {/* Bar accent */}
                <div style={{ background: '#fff', borderRadius: 6, padding: '8px', height: 60 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
                    {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i === 4 ? currentTheme.primaryColor : currentTheme.primaryColor + '30' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Button preview */}
          <div className="card card-p">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Botões e elementos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn" style={{ background: currentTheme.primaryColor, color: '#fff', border: 'none', width: '100%' }}>
                Botão primário
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: currentTheme.primaryColor + '20', color: currentTheme.primaryColor }}>
                  Badge
                </div>
                <div style={{ padding: '3px 1px', background: currentTheme.primaryColor, borderRadius: 4, width: 4 }} />
                <span style={{ fontSize: '0.875rem', color: currentTheme.primaryColor, fontWeight: 600 }}>Link ativo</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '65%', background: currentTheme.primaryColor, borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
