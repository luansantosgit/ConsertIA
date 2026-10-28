import React from 'react';
import { useThemeStore } from '@/stores/theme.store';

interface SidebarBrandProps {
  collapsed: boolean;
}

/** Logo/marca no topo da sidebar (imagem completa, ícone ou inicial). */
export const SidebarBrand: React.FC<SidebarBrandProps> = ({ collapsed }) => {
  const { activeTheme } = useThemeStore();

  if (!activeTheme.logoUrl) {
    return (
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-logo-btn" title={activeTheme.logoText}>
          {(activeTheme.logoText || 'C').charAt(0).toUpperCase()}
        </div>
        {!collapsed && <span className="sidebar-logo-text">{activeTheme.logoText}</span>}
      </div>
    );
  }

  if (activeTheme.logoType === 'full') {
    return (
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-logo-full" title={activeTheme.logoText}>
          <img src={activeTheme.logoUrl} alt={activeTheme.logoText} />
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-brand-wrapper">
      <div className="sidebar-logo-btn sidebar-logo-no-bg" title={activeTheme.logoText}>
        <img src={activeTheme.logoUrl} alt={activeTheme.logoText} />
      </div>
      {!collapsed && <span className="sidebar-logo-text">{activeTheme.logoText}</span>}
    </div>
  );
};
