import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  SolidDashboardIcon,
  SolidAtendimentoIcon,
  SolidOrdensIcon,
  SolidClientesIcon,
  SolidEstoqueIcon,
  SolidFinanceiroIcon,
  SolidAgendaIcon,
  SolidRelatoriosIcon,
  SolidAgenteIaIcon,
  SolidConfiguracoesIcon,
} from '@/components/SolidNavIcons';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}

const navItems = [
  { icon: SolidDashboardIcon, label: 'Dashboard', path: '/' },
  { icon: SolidAtendimentoIcon, label: 'Atendimento', path: '/atendimento' },
  { icon: SolidOrdensIcon, label: 'Ordens de Serviço', path: '/ordens' },
  { icon: SolidClientesIcon, label: 'Clientes', path: '/clientes' },
  { icon: SolidEstoqueIcon, label: 'Estoque', path: '/estoque' },
  { icon: SolidFinanceiroIcon, label: 'Financeiro', path: '/financeiro' },
  { icon: SolidAgendaIcon, label: 'Agenda', path: '/agenda' },
  { icon: SolidRelatoriosIcon, label: 'Relatórios', path: '/relatorios' },
  { icon: SolidAgenteIaIcon, label: 'Agente de IA', path: '/agente-ia' },
  { icon: SolidConfiguracoesIcon, label: 'Configurações', path: '/configuracoes' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed,
}) => {
  const { user, logout } = useAuthStore();
  const { activeTheme } = useThemeStore();
  const { t } = useTranslation();
  const location = useLocation();

  const initial = (user?.name || 'A').charAt(0).toUpperCase();

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-wrapper">
          {activeTheme.logoUrl ? (
            activeTheme.logoType === 'full' ? (
              /* Logo completo: mostra apenas a imagem, sem fundo e sem nome */
              <div className="sidebar-logo-full" title={activeTheme.logoText}>
                <img src={activeTheme.logoUrl} alt={activeTheme.logoText} />
              </div>
            ) : (
              /* Ícone: imagem sem fundo colorido */
              <>
                <div className="sidebar-logo-btn sidebar-logo-no-bg" title={activeTheme.logoText}>
                  <img src={activeTheme.logoUrl} alt={activeTheme.logoText} />
                </div>
                {!collapsed && <span className="sidebar-logo-text">{activeTheme.logoText}</span>}
              </>
            )
          ) : (
            /* Sem logo: inicial com fundo colorido */
            <>
              <div className="sidebar-logo-btn" title={activeTheme.logoText}>
                {(activeTheme.logoText || 'C').charAt(0).toUpperCase()}
              </div>
              {!collapsed && <span className="sidebar-logo-text">{activeTheme.logoText}</span>}
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const translatedLabel = t(item.label);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                data-label={translatedLabel}
                onClick={onClose}
                title={translatedLabel}
              >
                <item.icon size={20} active={isActive} />
                {!collapsed && <span className="sidebar-item-label">{translatedLabel}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button
            className="sidebar-item"
            data-label={t('Sair')}
            title={t('Sair')}
            onClick={logout}
          >
            <LogOut size={18} />
            {!collapsed && <span className="sidebar-item-label">{t('Sair')}</span>}
          </button>
          <div
            className="sidebar-user-btn"
            title={`${user?.name}\n${user?.tenantName}`}
          >
            {initial}
          </div>
        </div>
      </aside>
    </>
  );
};
