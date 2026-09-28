import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { supabase } from '@/lib/supabase';
import { Wrench, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

interface CompanyBranding {
  primary_color: string | null;
  logo_url: string | null;
  logo_type: 'icon' | 'full' | null;
  logo_text: string | null;
}

export const TenantLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  // globalTheme = cor/logo definidos pelo superadmin (aparece no login e em telas públicas)
  // companyBranding = tema próprio da empresa identificada pelo e-mail (whitelabel parcial)
  const { globalTheme } = useThemeStore();
  const [company, setCompany] = useState<CompanyBranding | null>(null);

  // Cor efetiva do login: a da empresa (se definiu e o plano permite) ou a global
  const loginPrimary = company?.primary_color || globalTheme.primaryColor;
  // Painel da marca: ícone SEMPRE global; gradiente com a cor efetiva
  const brandPrimaryDark = loginPrimary;
  // Formulário: logo da empresa se ela tiver o próprio; senão o global
  const formLogoUrl = company?.logo_url ?? globalTheme.logoUrl;
  const formLogoType = company?.logo_url ? (company.logo_type || 'full') : globalTheme.logoType;
  const formLogoText = company?.logo_text || globalTheme.logoText;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Identifica a empresa pelo e-mail para aplicar o branding dela no form
  useEffect(() => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setCompany(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('login-branding', { body: { email: trimmed } });
        setCompany(data?.theme ?? null);
      } catch {
        setCompany(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const { user } = useAuthStore.getState();
      navigate(user?.role === 'superadmin' ? '/superadmin' : '/');
    } else {
      setError(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="login-page">
      {/* Left - Form */}
      <div className="login-left">
        <div className="login-card">
          {/* Logo (empresa identificada pelo e-mail, com fallback pro global) */}
          <div className="login-logo" style={{ marginBottom: formLogoUrl && formLogoType === 'full' ? 24 : 32 }}>
            {formLogoUrl && formLogoType === 'full' ? (
              /* Logo completo: mostra apenas a imagem grande, sem o nome e sem fundo */
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <img
                  src={formLogoUrl}
                  alt={formLogoText}
                  style={{ maxHeight: 64, maxWidth: 280, width: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <>
                <div
                  className="login-logo-icon"
                  style={{
                    background: formLogoUrl ? 'transparent' : 'var(--primary)',
                    boxShadow: formLogoUrl ? 'none' : undefined,
                  }}
                >
                  {formLogoUrl ? (
                    <img src={formLogoUrl} alt={formLogoText} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Wrench size={22} />
                  )}
                </div>
                <div>
                  <div className="login-logo-name">{formLogoText}</div>
                  <div className="login-logo-sub">CRM + IA para Assistência Técnica</div>
                </div>
              </>
            )}
          </div>

          <h1 className="login-title">Bem-vindo de volta!</h1>
          <p className="login-subtitle">Faça login para acessar seu painel</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%', marginTop: 4, padding: '11px',
                background: loginPrimary,
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Esqueceu a senha? <a href="#" style={{ color: loginPrimary }}>Recuperar acesso</a></p>
          </div>
        </div>
      </div>

      {/* Right - Visual — ícone da marca é SEMPRE o global; cor pode ser da empresa */}
      <div
        className="login-right"
        style={{ background: `linear-gradient(145deg, ${loginPrimary} 0%, ${brandPrimaryDark} 100%)` }}
      >
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 360 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: 12,
            overflow: 'hidden',
          }}>
            {(globalTheme.faviconUrl || (globalTheme.logoUrl && globalTheme.logoType !== 'full')) ? (
              <img
                src={(globalTheme.faviconUrl || globalTheme.logoUrl)!}
                alt={globalTheme.logoText}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Wrench size={38} color="#fff" />
            )}
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', marginBottom: 12, letterSpacing: 0.3 }}>
            {globalTheme.logoText}
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>
            Gerencie sua assistência técnica com inteligência
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
            Controle OS, clientes, estoque e financeiro em um só lugar. Com IA integrada para automatizar processos e aumentar sua produtividade.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32, justifyContent: 'center' }}>
            {['Ordens de Serviço', 'Clientes', 'Estoque', 'Financeiro', 'IA integrada'].map((f) => (
              <span key={f} style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 99,
                padding: '5px 14px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
