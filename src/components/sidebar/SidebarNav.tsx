import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscriptionAlert } from '@/stores/subscription.store';
import { canAccess } from '@/lib/permissions';
import { navItems } from './nav-items';

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate: () => void;
}

/** Navegação principal, com grupos expansíveis e alerta de assinatura. */
export const SidebarNav: React.FC<SidebarNavProps> = ({ collapsed, onNavigate }) => {
  const { user } = useAuthStore();
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

  const toggleGroup = (path: string, forced: boolean) => {
    setOpenGroups(prev => ({ ...prev, [path]: !(prev[path] ?? forced) }));
  };

  const alertDot = (style: React.CSSProperties) => (hasOverdue || dueSoon) ? (
    <span
      className="nav-alert-dot"
      title={hasOverdue ? 'Assinatura vencida' : 'Assinatura vence hoje'}
      style={style}
    />
  ) : null;

  return (
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
                  {!groupOpen && alertDot({
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: hasOverdue ? 'var(--danger)' : '#f59e0b',
                  })}
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
                  onClick={onNavigate}
                  title={t(child.label)}
                  style={{ paddingLeft: 38, fontSize: '0.8125rem' }}
                >
                  <span className="sidebar-item-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t(child.label)}
                    {child.path === '/assinatura' && alertDot({
                      width: 8, height: 8, borderRadius: '50%',
                      background: hasOverdue ? 'var(--danger)' : '#f59e0b',
                      flexShrink: 0,
                    })}
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
            onClick={onNavigate}
            title={translatedLabel}
            style={{ position: 'relative' }}
          >
            <item.icon size={20} active={isActive} />
            {!collapsed && <span className="sidebar-item-label">{translatedLabel}</span>}
            {collapsed && item.children && alertDot({
              position: 'absolute', top: 9, right: 9,
              width: 8, height: 8, borderRadius: '50%',
              background: hasOverdue ? 'var(--danger)' : '#f59e0b',
            })}
          </NavLink>
        );
      })}
    </nav>
  );
};
