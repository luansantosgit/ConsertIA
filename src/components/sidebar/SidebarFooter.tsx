import React from 'react';
import { GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import { APP_VERSION_LABEL } from '@/lib/version';

interface SidebarFooterProps {
  collapsed: boolean;
}

/** Rodapé da sidebar: sair, usuário e versão do app. */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({ collapsed }) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initial = (user?.name || 'A').charAt(0).toUpperCase();

  return (
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
      <button
        type="button"
        className="sidebar-user sidebar-user-link"
        onClick={() => navigate('/treinamento')}
        title={`${user?.name}\n${user?.tenantName}\n${APP_VERSION_LABEL}\n${t('Treinamento')}`}
        aria-label={t('Treinamento')}
      >
        <div className="sidebar-user-btn">{initial}</div>
        {collapsed ? (
          <span className="sidebar-version sidebar-version-compact">{APP_VERSION_LABEL}</span>
        ) : (
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-version" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GraduationCap size={12} />
              {APP_VERSION_LABEL}
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
