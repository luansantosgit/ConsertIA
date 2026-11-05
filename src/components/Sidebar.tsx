import React from 'react';
import { SidebarBrand } from './sidebar/SidebarBrand';
import { SidebarNav } from './sidebar/SidebarNav';
import { SidebarFooter } from './sidebar/SidebarFooter';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed,
}) => {
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} onNavigate={onClose} />
        <SidebarFooter collapsed={collapsed} />
      </aside>
    </>
  );
};
