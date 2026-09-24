import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetAll = vi.fn().mockResolvedValue([]);
const mockAiConvIds = vi.fn().mockResolvedValue([]);
const mockFetchUsers = vi.fn().mockResolvedValue([]);

vi.mock('@/repositories/customer.repository', () => ({
  CustomerRepository: class {
    getAll = mockGetAll;
  },
}));

vi.mock('@/repositories/service-order.repository', () => ({
  ServiceOrderRepository: class {
    getAll = mockGetAll;
    countByStatus = vi.fn().mockResolvedValue({});
  },
}));

vi.mock('@/repositories/calendar-event.repository', () => ({
  CalendarEventRepository: class {
    getAll = mockGetAll;
  },
}));

vi.mock('@/repositories/message.repository', () => ({
  MessageRepository: class {
    getAiConversationIds = mockAiConvIds;
  },
}));

vi.mock('@/repositories/user.repository', () => ({
  fetchTenantUsers: mockFetchUsers,
}));

vi.mock('@/components/OSModal', () => ({
  OSModal: () => <div>modal</div>,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ user: { tenantId: 't1' } }),
  },
}));

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue([]);
  mockAiConvIds.mockReset();
  mockAiConvIds.mockResolvedValue([]);
  mockFetchUsers.mockReset();
  mockFetchUsers.mockResolvedValue([]);
});

async function importDashboard() {
  const mod = await import('@/pages/Dashboard');
  return mod.Dashboard;
}

function renderDashboard(Dashboard: React.ComponentType) {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  it('shows loading state initially then renders content', async () => {
    const Dashboard = await importDashboard();
    renderDashboard(Dashboard);
    await waitFor(() => {
      expect(screen.getByText('Evolução de Atendimentos')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockGetAll.mockRejectedValue(new Error('fail'));

    const Dashboard = await importDashboard();
    renderDashboard(Dashboard);
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados do dashboard')).toBeTruthy();
    });
  });

  it('shows empty states when no data', async () => {
    const Dashboard = await importDashboard();
    renderDashboard(Dashboard);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma OS encontrada')).toBeTruthy();
    });
    expect(screen.getByText('Nenhum agendamento encontrado')).toBeTruthy();
    expect(screen.getByText('Nenhuma OS atribuída a técnicos')).toBeTruthy();
  });
});
