import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockCount = vi.fn().mockResolvedValue(10);
const mockGetAll = vi.fn().mockResolvedValue([]);

vi.mock('@/repositories/customer.repository', () => ({
  CustomerRepository: class {
    count = mockCount;
    getAll = mockGetAll;
  },
}));

vi.mock('@/repositories/service-order.repository', () => ({
  ServiceOrderRepository: class {
    getAll = vi.fn().mockResolvedValue([]);
    countByStatus = vi.fn().mockResolvedValue({});
  },
}));

vi.mock('@/repositories/conversation.repository', () => ({
  ConversationRepository: class {
    getOpen = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock('@/repositories/transaction.repository', () => ({
  TransactionRepository: class {
    getTotalIncome = vi.fn().mockResolvedValue(0);
    getTotalExpenses = vi.fn().mockResolvedValue(0);
  },
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
  mockCount.mockReset();
  mockCount.mockResolvedValue(10);
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue([]);
});

async function importDashboard() {
  const mod = await import('@/pages/Dashboard');
  return mod.Dashboard;
}

describe('Dashboard', () => {
  it('shows loading state initially then renders content', async () => {
    const Dashboard = await importDashboard();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Ordens Recentes')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockCount.mockRejectedValue(new Error('fail'));
    mockGetAll.mockRejectedValue(new Error('fail'));

    const Dashboard = await importDashboard();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados do dashboard')).toBeTruthy();
    });
  });

  it('shows empty state for orders when no data', async () => {
    const Dashboard = await importDashboard();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma ordem de serviço encontrada')).toBeTruthy();
    });
  });
});
