import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import ErrorBoundary from '@/components/ErrorBoundary';

// Tenant (eager — layout crítico)
import { TenantLogin } from '@/pages/TenantLogin';
import { TenantLayout } from '@/components/TenantLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Customers } from '@/pages/Customers';

// Tenant (lazy — code-split por rota)
const ServiceOrders = lazy(() => import('@/pages/ServiceOrders').then(m => ({ default: m.ServiceOrders })));
const Attendance    = lazy(() => import('@/pages/Attendance').then(m => ({ default: m.Attendance })));
const Inventory     = lazy(() => import('@/pages/Inventory').then(m => ({ default: m.Inventory })));
const Financial     = lazy(() => import('@/pages/Financial').then(m => ({ default: m.Financial })));
const Schedule      = lazy(() => import('@/pages/Schedule').then(m => ({ default: m.Schedule })));
const Reports       = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));
const Settings      = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AiSettings    = lazy(() => import('@/pages/AiSettings').then(m => ({ default: m.AiSettings })));
const ChecklistPage = lazy(() => import('@/pages/ChecklistPage').then(m => ({ default: m.ChecklistPage })));

// Superadmin
import { SuperAdminLayout }   from '@/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from '@/superadmin/SuperAdminDashboard';
import { SuperAdminCompanies } from '@/superadmin/SuperAdminCompanies';
import { SuperAdminPlans }    from '@/superadmin/SuperAdminPlans';
import { SuperAdminTheme }    from '@/superadmin/SuperAdminTheme';
import { SuperAdminIntegracoes } from '@/superadmin/SuperAdminIntegracoes';
import { SuperAdminAi } from '@/superadmin/SuperAdminAi';
import { SuperAdminLeads } from '@/superadmin/SuperAdminLeads';
import { SuperAdminSettings } from '@/superadmin/SuperAdminSettings';

import './i18n/config';
import './styles.css';

/* ── Fallback de loading (skeleton) ── */
const PageLoader: React.FC = () => (
  <div className="page" style={{ gap: 16 }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{ height: i === 1 ? 52 : 180, borderRadius: 12, background: 'linear-gradient(90deg, #f1f5f9 25%, #e5e9f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
    ))}
    <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

/* ── Proteção de rotas ── */
const RequireAuth: React.FC<{ role?: 'superadmin' | 'tenant'; children: React.ReactNode }> = ({
  role, children,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'superadmin' && user?.role !== 'superadmin') return <Navigate to="/app" replace />;
  if (role === 'tenant' && user?.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { user, isAuthenticated, initSession } = useAuthStore();
  const { applyTheme, loadTenantTheme, loadGlobalTheme, reapplyCSS } = useThemeStore();

  // Restaura sessão ao carregar o app
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Tema global vem do banco (funciona em qualquer origem, ex: Vercel)
  useEffect(() => {
    loadGlobalTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica IMEDIATAMENTE o CSS do tema persistido no primeiro render
  // (evita o logo piscar antes da auth resolver)
  useEffect(() => {
    reapplyCSS();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica o tema correto ao carregar
  useEffect(() => {
    if (user?.tenantId) {
      loadTenantTheme(user.tenantId);
    } else {
      applyTheme();
    }
  }, [user?.tenantId, loadTenantTheme, applyTheme]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        {/* ── Superadmin ── */}
        <Route
          path="/superadmin"
          element={
            <RequireAuth role="superadmin">
              <SuperAdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="empresas" element={<SuperAdminCompanies />} />
          <Route path="leads" element={<SuperAdminLeads />} />
          <Route path="planos" element={<SuperAdminPlans />} />
          <Route path="tema" element={<SuperAdminTheme />} />
          <Route path="integracoes" element={<SuperAdminIntegracoes />} />
          <Route path="configuracoes" element={<SuperAdminSettings />} />
          <Route path="provedor-ia" element={<SuperAdminAi />} />
        </Route>

        {/* ── Tenant ── */}
        <Route path="/login" element={<TenantLogin />} />
        <Route
          path="/app"
          element={
            <RequireAuth role="tenant">
              <TenantLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="atendimento" element={<Suspense fallback={<PageLoader />}><Attendance /></Suspense>} />
          <Route path="ordens" element={<Suspense fallback={<PageLoader />}><ServiceOrders /></Suspense>} />
          <Route path="estoque" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="financeiro" element={<Suspense fallback={<PageLoader />}><Financial /></Suspense>} />
          <Route path="agenda" element={<Suspense fallback={<PageLoader />}><Schedule /></Suspense>} />
          <Route path="relatorios" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
          <Route path="configuracoes" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          <Route path="agente-ia" element={<Suspense fallback={<PageLoader />}><AiSettings /></Suspense>} />
        </Route>

        {/* ── Checklist público ── */}
        <Route path="/checklist/:osId" element={<Suspense fallback={<PageLoader />}><ChecklistPage /></Suspense>} />

        {/* ── Redirects padrão ── */}
        {/* Em produção o site institucional (HTML estático) ocupa "/" do domínio
            principal via vercel.json; em dev/edge casos o SPA decide pelo auth. */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              user?.role === 'superadmin' ? (
                <Navigate to="/superadmin" replace />
              ) : (
                <Navigate to="/app" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={
            isAuthenticated ? (
              user?.role === 'superadmin' ? (
                <Navigate to="/superadmin" replace />
              ) : (
                <Navigate to="/app" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
