import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetAll = vi.fn().mockResolvedValue([]);

vi.mock('@/repositories/customer.repository', () => ({
  CustomerRepository: class {
    getAll = mockGetAll;
    create = vi.fn().mockResolvedValue({});
    update = vi.fn().mockResolvedValue({});
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ user: { tenantId: 't1' } }),
  },
}));

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue([]);
});

async function importCustomers() {
  const mod = await import('@/pages/Customers');
  return mod.Customers;
}

describe('Customers page', () => {
  it('shows skeleton while loading', async () => {
    mockGetAll.mockReturnValue(new Promise(() => {}));
    const Customers = await importCustomers();
    const { container } = render(<Customers />);
    expect(container.querySelector('.page')).toBeTruthy();
  });

  it('renders table rows after loading', async () => {
    mockGetAll.mockResolvedValue([
      { id: '1', name: 'John', email: 'j@b.com', tenant_id: 't1', created_at: '', updated_at: '' },
    ]);
    const Customers = await importCustomers();
    render(<Customers />);
    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockGetAll.mockRejectedValue(new Error('fail'));
    const Customers = await importCustomers();
    render(<Customers />);
    await waitFor(() => {
      expect(screen.getByText('Tentar novamente')).toBeTruthy();
    });
  });

  it('shows empty state when no customers', async () => {
    mockGetAll.mockResolvedValue([]);
    const Customers = await importCustomers();
    render(<Customers />);
    await waitFor(() => {
      expect(screen.getByText('Nenhum cliente encontrado')).toBeTruthy();
    });
  });
});
