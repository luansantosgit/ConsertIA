import React from 'react';
import { Plus, PanelLeftClose, PanelLeftOpen, AlertTriangle, Bot, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useModeStore } from '@/stores/mode.store';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscriptionAlert } from '@/stores/subscription.store';
import { useAiQuotaAlert } from '@/stores/ai-quota.store';
import { LanguageSwitcher } from './header/LanguageSwitcher';
import { TutorialHint } from './header/TutorialHint';

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

export const Header: React.FC<HeaderProps> = ({ onMenuClick, collapsed, onToggleCollapse }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();
  const { hasOverdue } = useSubscriptionAlert();
  const { tokensPaused } = useAiQuotaAlert();
  const { mode, toggleMode } = useModeStore();

  const meta = pageMeta[location.pathname] ?? { title: location.pathname.replace('/', ''), addLabel: '' };
  const initial = (user?.name || 'A').charAt(0).toUpperCase();
  // No chat o balão flutuante cobre o input: o alerta sobe para o header
  const showSubscriptionAlert = location.pathname.startsWith('/atendimento') && hasOverdue;
  const showTokensAlert = location.pathname.startsWith('/atendimento') && tokensPaused;

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
        {/* Alerta de assinatura vencida (no chat, substitui o balão flutuante) */}
        {showSubscriptionAlert && (
          <Link
            to="/assinatura"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, textDecoration: 'none',
              background: 'var(--danger)', color: '#fff',
              fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
              animation: 'navDotPulse 1.4s ease-in-out infinite',
            }}
            title="Pagar assinatura"
          >
            <AlertTriangle size={13} />
            Assinatura vencida
          </Link>
        )}

        {/* Alerta de tokens de IA esgotados (no chat, substitui o balão flutuante) */}
        {showTokensAlert && (
          <Link
            to="/agente-ia?comprar=tokens"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, textDecoration: 'none',
              background: '#7c3aed', color: '#fff',
              fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
              animation: 'navDotPulse 1.4s ease-in-out infinite',
            }}
            title="Comprar mais tokens de IA"
          >
            <Bot size={13} />
            Tokens esgotados
          </Link>
        )}

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

        {/* Dark mode toggle */}
        <button
          className="header-icon-btn"
          id="dark-mode-toggle-btn"
          onClick={toggleMode}
          aria-label={mode === 'dark' ? t('Ativar modo claro') : t('Ativar modo escuro')}
          title={mode === 'dark' ? t('Ativar modo claro') : t('Ativar modo escuro')}
        >
          {mode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Atalho do tutorial (só aparece com conteúdo publicado) */}
        <TutorialHint />

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
