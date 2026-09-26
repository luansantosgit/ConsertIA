import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard, Building2, CreditCard, Palette, Link2,
  LogOut, Shield, PanelLeftClose, PanelLeftOpen, Bot, Filter, Settings,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin' },
  { icon: Building2, label: 'Empresas', path: '/superadmin/empresas' },
  { icon: Filter, label: 'Funil de Leads', path: '/superadmin/leads' },
  { icon: CreditCard, label: 'Planos', path: '/superadmin/planos' },
  { icon: Palette, label: 'Temas & Marcas', path: '/superadmin/tema' },
  { icon: Link2, label: 'Integrações', path: '/superadmin/integracoes' },
  { icon: Settings, label: 'Configurações', path: '/superadmin/configuracoes' },
  { icon: Bot, label: 'Provedor de IA', path: '/superadmin/provedor-ia' },
];

export const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useTranslation();

  const currentNavItem = navItems.find(i =>
    i.path === '/superadmin'
      ? location.pathname === '/superadmin'
      : location.pathname.startsWith(i.path)
  );

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar sa-sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div
          className="sidebar-logo-btn"
          title="DeeperIA Superadmin"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
        >
          <Shield size={20} />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.path === '/superadmin'
                ? location.pathname === '/superadmin'
                : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                data-label={item.label}
                onClick={() => setMobileOpen(false)}
                title={item.label}
              >
                <item.icon size={20} />
                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button
            className="sidebar-item"
            data-label="Sair"
            title="Sair do Superadmin"
            onClick={logout}
          >
            <LogOut size={18} />
            {!collapsed && <span className="sidebar-item-label">Sair</span>}
          </button>
          <div
            className="sidebar-user-btn"
            title={`${user?.name || 'Super Admin'}\nSuperadministrador`}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
          >
            SA
          </div>
        </div>
      </aside>

      <div className={`app-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="header">
          <div className="header-left">
            <button
              className="header-icon-btn"
              id="mobile-menu-btn"
              onClick={() => setCollapsed(v => !v)}
              aria-label="Toggle menu"
            >
              {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="header-page-title">{currentNavItem?.label || 'Superadmin'}</h1>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                padding: '3px 9px',
                borderRadius: 99,
                letterSpacing: '0.05em'
              }}>
                SUPERADMIN
              </span>
            </div>
          </div>

          <div className="header-right">
            <div
              className="header-avatar"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'default' }}
              title={`${user?.name} — Superadministrador`}
            >
              SA
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
