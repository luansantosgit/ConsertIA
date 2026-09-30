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
import { LogOut, ChevronDown } from 'lucide-react';
import { canAccess } from '@/lib/permissions';
import { useSubscriptionAlert } from '@/stores/subscription.store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}

const navItems = [
  { icon: SolidDashboardIcon, label: 'Dashboard', path: '/', perm: 'dashboard' },
  { icon: SolidAtendimentoIcon, label: 'Atendimento', path: '/atendimento', perm: 'atendimento' },
  { icon: SolidOrdensIcon, label: 'Ordens de Serviço', path: '/ordens', perm: 'ordens' },
  { icon: SolidClientesIcon, label: 'Clientes', path: '/clientes', perm: 'clientes' },
  { icon: SolidEstoqueIcon, label: 'Estoque', path: '/estoque', perm: 'estoque' },
  {
    icon: SolidFinanceiroIcon, label: 'Financeiro', path: '/financeiro', perm: 'financeiro',
    children: [
      { label: 'Lançamentos', path: '/financeiro' },
      { label: 'Assinatura', path: '/assinatura' },
    ],
  },
  { icon: SolidAgendaIcon, label: 'Agenda', path: '/agenda', perm: 'agenda' },
  { icon: SolidRelatoriosIcon, label: 'Relatórios', path: '/relatorios', perm: 'relatorios' },
  { icon: SolidAgenteIaIcon, label: 'Agente de IA', path: '/agente-ia', perm: 'agente-ia' },
  { icon: SolidConfiguracoesIcon, label: 'Configurações', path: '/configuracoes', perm: 'configuracoes' },
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
  const { hasOverdue, dueSoon } = useSubscriptionAlert();
  // undefined = segue a rota (abre se ativo); true/false = override manual
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean | undefined>>({});

  // Navegou para outro menu: submenus fecham sozinhos
  React.useEffect(() => { setOpenGroups({}); }, [location.pathname]);

  // Algum submenu aberto? Só então o menu mostra scrollbar
  const anyGroupOpen = navItems.some(item => item.children && !collapsed &&
    (openGroups[item.path] ?? item.children.some(c => location.pathname.startsWith(c.path))));

  const initial = (user?.name || 'A').charAt(0).toUpperCase();

  const toggleGroup = (path: string, forced: boolean) => {
    setOpenGroups(prev => ({ ...prev, [path]: !(prev[path] ?? forced) }));
  };

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

        <nav className="sidebar-nav" style={{ overflowY: 'auto', scrollbarWidth: anyGroupOpen ? 'thin' : 'none' }}>
          {navItems.filter(item => canAccess(user, item.perm)).map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const translatedLabel = t(item.label);

            // Grupo com submenu (ex.: Financeiro → Lançamentos/Assinatura)
            if (item.children && !collapsed) {
              const groupForced = item.children.some(c => location.pathname.startsWith(c.path));
              const groupOpen = openGroups[item.path] ?? groupForced;
              return (
                <div key={item.path} id={`nav-group-${item.path.replace('/', '')}`}>
                  <button
                    className="sidebar-item"
                    data-label={translatedLabel}
                    title={translatedLabel}
                    onClick={() => {
                      const willOpen = !(openGroups[item.path] ?? groupForced);
                      toggleGroup(item.path, groupForced);
                      if (willOpen) {
                        // Scroll suave dentro do menu: nao empurra Sair/usuario
                        requestAnimationFrame(() => {
                          document
                            .getElementById(`nav-group-${item.path.replace('/', '')}`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        });
                      }
                    }}
                    style={{
                      width: '100%', background: groupForced ? 'var(--primary-light)' : 'transparent',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <item.icon size={20} active={groupForced} />
                      <span className="sidebar-item-label">{translatedLabel}</span>
                      {!groupOpen && (hasOverdue || dueSoon) && (
                        <span
                          className="nav-alert-dot"
                          title={hasOverdue ? 'Assinatura vencida' : 'Assinatura vence hoje'}
                          style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: hasOverdue ? 'var(--danger)' : '#f59e0b',
                          }}
                        />
                      )}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: groupOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s', flexShrink: 0,
                      }}
                    />
                  </button>
                  {groupOpen && item.children.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      end={child.path === '/'}
                      className="sidebar-item"
                      data-label={t(child.label)}
                      onClick={onClose}
                      title={t(child.label)}
                      style={{ paddingLeft: 38, fontSize: '0.8125rem' }}
                    >
                      <span className="sidebar-item-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t(child.label)}
                        {child.path === '/assinatura' && (hasOverdue || dueSoon) && (
                          <span
                            className="nav-alert-dot"
                            title={hasOverdue ? 'Assinatura vencida' : 'Assinatura vence hoje'}
                            style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: hasOverdue ? 'var(--danger)' : '#f59e0b',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </span>
                    </NavLink>
                  ))}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                data-label={translatedLabel}
                onClick={onClose}
                title={translatedLabel}
                style={{ position: 'relative' }}
              >
                <item.icon size={20} active={isActive} />
                {!collapsed && <span className="sidebar-item-label">{translatedLabel}</span>}
                {collapsed && item.children && (hasOverdue || dueSoon) && (
                  <span
                    className="nav-alert-dot"
                    title={hasOverdue ? 'Assinatura vencida' : 'Assinatura vence hoje'}
                    style={{
                      position: 'absolute', top: 9, right: 9,
                      width: 8, height: 8, borderRadius: '50%',
                      background: hasOverdue ? 'var(--danger)' : '#f59e0b',
                    }}
                  />
                )}
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
