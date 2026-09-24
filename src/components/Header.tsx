import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
  onMenuClick: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const pageMeta: Record<string, { title: string; addLabel: string; subtitle?: string }> = {
  '/':              { title: 'Dashboard',         addLabel: 'Nova OS', subtitle: 'Visão geral do seu atendimento e desempenho' },
  '/atendimento':   { title: 'Atendimento',        addLabel: 'Nova Conversa'     },
  '/ordens':        { title: 'Ordens de Serviço',  addLabel: 'Nova OS'           },
  '/clientes':      { title: 'Clientes',           addLabel: 'Novo Cliente'      },
  '/estoque':       { title: 'Estoque',            addLabel: 'Novo Item'         },
  '/financeiro':    { title: 'Financeiro',         addLabel: 'Novo Lançamento'   },
  '/agenda':        { title: 'Agenda',             addLabel: 'Novo Evento'       },
  '/relatorios':    { title: 'Relatórios',         addLabel: ''                  },
  '/configuracoes': { title: 'Configurações',      addLabel: ''                  },
  '/agente-ia':     { title: 'Agente de IA',       addLabel: ''                  },
};

const LANGS = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'PT' },
  { code: 'en',    flag: '🇺🇸', label: 'EN' },
  { code: 'es',    flag: '🇪🇸', label: 'ES' },
] as const;

export const Header: React.FC<HeaderProps> = ({ onMenuClick, collapsed, onToggleCollapse }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { language, changeLanguage, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const meta = pageMeta[location.pathname] ?? { title: location.pathname.replace('/', ''), addLabel: '' };
  const initial = (user?.name || 'A').charAt(0).toUpperCase();
  const currentLang = LANGS.find(l => l.code === language) ?? LANGS[0];

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      {/* Left — mobile menu toggle + page title */}
      <div className="header-left">
        <button
          className="header-icon-btn"
          id="mobile-menu-btn"
          onClick={onToggleCollapse || onMenuClick}
          aria-label="Toggle menu"
        >
          {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
        </button>
        <div className="header-title-wrap">
          <h1 className="header-page-title">{t(meta.title)}</h1>
          {meta.subtitle && <span className="header-page-subtitle">{t(meta.subtitle)}</span>}
        </div>
      </div>

      {/* Right — add button + language switcher + avatar */}
      <div className="header-right">
        {/* Add button — só se a página tiver ação */}
        {meta.addLabel && (
          <button
            className="header-add-btn"
            id={`header-add-${location.pathname.replace('/', '') || 'dashboard'}`}
            onClick={() => window.dispatchEvent(new CustomEvent('header-action-click', { detail: { path: location.pathname } }))}
          >
            {t(meta.addLabel)}
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={13} />
            </div>
          </button>
        )}

        {/* Language switcher */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button
            className="header-icon-btn"
            id="lang-switcher-btn"
            onClick={() => setLangOpen(v => !v)}
            aria-label="Trocar idioma"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 8,
              width: 'auto', fontSize: '0.8125rem', fontWeight: 600,
              border: '1px solid var(--border)',
              background: langOpen ? 'var(--input-bg)' : 'transparent',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <ChevronDown
              size={13}
              style={{ transition: 'transform 0.15s', transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* Dropdown */}
          {langOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 140, overflow: 'hidden', zIndex: 200,
              animation: 'slideUp 0.15s ease',
            }}>
              {LANGS.map(lang => (
                <button
                  key={lang.code}
                  id={`lang-${lang.code}`}
                  onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px',
                    border: 'none', background: language === lang.code ? 'var(--primary-light)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.875rem', fontWeight: language === lang.code ? 600 : 400,
                    color: language === lang.code ? 'var(--primary)' : 'var(--text-primary)',
                    textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (language !== lang.code) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (language !== lang.code) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '1.125rem' }}>{lang.flag}</span>
                  <span>
                    {lang.code === 'pt-BR' && 'Português (BR)'}
                    {lang.code === 'en'    && 'English'}
                    {lang.code === 'es'    && 'Español'}
                  </span>
                  {language === lang.code && (
                    <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div
          className="header-avatar"
          id="header-user-avatar"
          title={`${user?.name} — ${user?.tenantName ?? 'Superadmin'}`}
          style={{ cursor: 'default' }}
        >
          {initial}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
};
