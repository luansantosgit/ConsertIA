import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { canAccess, firstAllowedPath } from '@/lib/permissions';
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
const SubscriptionPage = lazy(() => import('@/pages/subscription/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
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
import { SuperAdminWizard } from '@/superadmin/SuperAdminWizard';

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
  const { isAuthenticated, user, authReady } = useAuthStore();
  // Boot: espera initSession resolver antes de renderizar páginas —
  // evita queries com tenantId vazio (400) em cold boot
  if (!authReady) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'superadmin' && user?.role !== 'superadmin') return <Navigate to="/" replace />;
  if (role === 'tenant' && user?.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return <>{children}</>;
};

/* Bloqueia rota de módulo não liberado para o usuário (visível no menu + URL direta) */
const RequirePermission: React.FC<{ perm: string; children: React.ReactNode }> = ({ perm, children }) => {
  const { user } = useAuthStore();
  if (canAccess(user, perm)) return <>{children}</>;
  const fallback = firstAllowedPath(user);
  if (fallback) return <Navigate to={fallback} replace />;
  return <NoAccess />;
};

/* Usuário sem nenhum módulo atribuído */
const NoAccess: React.FC = () => {
  const { logout } = useAuthStore();
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 12 }}>
      <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Nenhuma permissão atribuída</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 380 }}>
        Sua conta não tem acesso a nenhum módulo do sistema. Contate o administrador da empresa.
      </p>
      <button className="btn btn-secondary" onClick={logout}>Sair</button>
    </div>
  );
};

const App: React.FC = () => {
  const { user, isAuthenticated, initSession } = useAuthStore();
  const { applyTheme, loadTenantTheme, loadGlobalTheme, reapplyCSS } = useThemeStore();

  // Restaura sessão ao carregar o app
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Sessão expirada (refresh falhou): limpa o estado e volta ao login
  useEffect(() => {
    const handler = () => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;
      useAuthStore.setState({ user: null, isAuthenticated: false });
    };
    window.addEventListener('session-expired', handler);
    return () => window.removeEventListener('session-expired', handler);
  }, []);

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
          <Route path="wizard" element={<SuperAdminWizard />} />
          <Route path="configuracoes" element={<SuperAdminSettings />} />
          <Route path="provedor-ia" element={<SuperAdminAi />} />
        </Route>

        {/* ── Tenant ── */}
        <Route path="/login" element={<TenantLogin />} />
        <Route
          path="/"
          element={
            <RequireAuth role="tenant">
              <TenantLayout />
            </RequireAuth>
          }
        >
          <Route index element={<RequirePermission perm="dashboard"><Dashboard /></RequirePermission>} />
          <Route path="clientes" element={<RequirePermission perm="clientes"><Customers /></RequirePermission>} />
          <Route path="atendimento" element={<RequirePermission perm="atendimento"><Suspense fallback={<PageLoader />}><Attendance /></Suspense></RequirePermission>} />
          <Route path="ordens" element={<RequirePermission perm="ordens"><Suspense fallback={<PageLoader />}><ServiceOrders /></Suspense></RequirePermission>} />
          <Route path="estoque" element={<RequirePermission perm="estoque"><Suspense fallback={<PageLoader />}><Inventory /></Suspense></RequirePermission>} />
          <Route path="financeiro" element={<RequirePermission perm="financeiro"><Suspense fallback={<PageLoader />}><Financial /></Suspense></RequirePermission>} />
          <Route path="assinatura" element={<RequirePermission perm="financeiro"><Suspense fallback={<PageLoader />}><SubscriptionPage /></Suspense></RequirePermission>} />
          <Route path="agenda" element={<RequirePermission perm="agenda"><Suspense fallback={<PageLoader />}><Schedule /></Suspense></RequirePermission>} />
          <Route path="relatorios" element={<RequirePermission perm="relatorios"><Suspense fallback={<PageLoader />}><Reports /></Suspense></RequirePermission>} />
          <Route path="configuracoes" element={<RequirePermission perm="configuracoes"><Suspense fallback={<PageLoader />}><Settings /></Suspense></RequirePermission>} />
          <Route path="agente-ia" element={<RequirePermission perm="agente-ia"><Suspense fallback={<PageLoader />}><AiSettings /></Suspense></RequirePermission>} />
        </Route>

        {/* ── Checklist público ── */}
        <Route path="/checklist/:osId" element={<Suspense fallback={<PageLoader />}><ChecklistPage /></Suspense>} />

        {/* ── Cadastro rápido público ── */}
        <Route path="/comece-agora" element={<Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense>} />

        {/* ── Redirect padrão ── */}
        {/* Em produção o vercel.json serve o site institucional em "/" apenas
            do domínio principal; subdomínios e previews caem no SPA direto. */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              user?.role === 'superadmin' ? (
                <Navigate to="/superadmin" replace />
              ) : (
                <Navigate to="/" replace />
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
