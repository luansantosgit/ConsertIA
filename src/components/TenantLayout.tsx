import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SubscriptionAlert } from './SubscriptionAlert';
import { useSubscriptionAlert } from '@/stores/subscription.store';

export const TenantLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const showFloatingFooter = !location.pathname.startsWith('/atendimento');

  // Carência expirada: o sistema só abre na página de Assinatura.
  // Re-verifica a cada 5 min: o balão de vencimento aparece/desaparece
  // sozinho conforme o pagamento.
  const { blocked, checked, check } = useSubscriptionAlert();
  React.useEffect(() => {
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [check]);
  const subscriptionBlocked = checked && blocked && location.pathname !== '/assinatura';

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
      />
      <div className={`app-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          onMenuClick={() => setSidebarOpen((v) => !v)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {subscriptionBlocked ? <Navigate to="/assinatura" replace /> : <Outlet />}
        </main>
        {showFloatingFooter && (
          <div
            aria-hidden
            style={{
            position: 'fixed',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 16px',
            borderRadius: 999,
            background: 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            zIndex: 40,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Feito com carinho por Grupo LS Soluções ❤
        </div>
        )}
        <SubscriptionAlert />
      </div>
    </div>
  );
};
