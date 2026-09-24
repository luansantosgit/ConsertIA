import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { CustomerRepository } from '@/repositories/customer.repository';
import { ServiceOrderRepository } from '@/repositories/service-order.repository';
import { CalendarEventRepository } from '@/repositories/calendar-event.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { fetchTenantUsers } from '@/repositories/user.repository';
import { OSModal } from '@/components/OSModal';
import ErrorMessage from '@/components/ErrorMessage';
import { DashboardSkeleton } from './dashboard/DashboardSkeleton';
import { KpiRow } from './dashboard/KpiRow';
import { EvolutionChart } from './dashboard/EvolutionChart';
import { StatusDonut } from './dashboard/StatusDonut';
import { RecentAppointments } from './dashboard/RecentAppointments';
import { ClientAnalysis } from './dashboard/ClientAnalysis';
import { StageBars } from './dashboard/StageBars';
import { TeamPerformance } from './dashboard/TeamPerformance';
import { AiAgentBanner } from './dashboard/AiAgentBanner';
import { computeDashboardStats, type DashboardStats } from './dashboard/dashboard.utils';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showOSModal, setShowOSModal] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setShowOSModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tenantId = useAuthStore.getState().user?.tenantId ?? '';
      const [customers, orders, events, users] = await Promise.all([
        new CustomerRepository().getAll(),
        new ServiceOrderRepository().getAll(),
        new CalendarEventRepository().getAll(),
        fetchTenantUsers(tenantId),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const msgRepo = new MessageRepository();
      const [aiAll, aiThis, aiLast] = await Promise.all([
        msgRepo.getAiConversationIds(),
        msgRepo.getAiConversationIds(thisMonthStart.toISOString(), now.toISOString()),
        msgRepo.getAiConversationIds(lastMonthStart.toISOString(), thisMonthStart.toISOString()),
      ]);

      setStats(
        computeDashboardStats(customers, orders, events, users, {
          total: aiAll.length,
          thisMonth: aiThis.length,
          lastMonth: aiLast.length,
        })
      );
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="page" style={{ padding: '24px 28px' }}>
        <ErrorMessage message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '24px 28px', gap: 20 }}>
      {showOSModal && (
        <OSModal
          onClose={() => setShowOSModal(false)}
          onSave={() => setShowOSModal(false)}
        />
      )}

      {loading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <>
          <KpiRow stats={stats} />

          <div className="dash-row-2">
            <EvolutionChart
              eventDates={stats.eventDates}
              orderCreatedDates={stats.orderCreatedDates}
              orderCompletedDates={stats.orderCompletedDates}
            />
            <StatusDonut groups={stats.groups} />
            <RecentAppointments events={stats.recentAppointments} />
          </div>

          <div className="dash-row-3">
            <ClientAnalysis stats={stats} />
            <StageBars groups={stats.groups} />
            <TeamPerformance team={stats.team} />
          </div>

          <AiAgentBanner stats={stats} />
        </>
      )}
    </div>
  );
};
