import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ ...mockChain })),
  },
}));

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin', tenantId: 't1', tenantName: 'T' }, isAuthenticated: true });
  vi.clearAllMocks();
  mockChain.then.mockImplementation(function (this: any, resolve: any) {
    resolve({ data: null, error: null });
  });
});

function setupData(data: any, error: any = null) {
  mockChain.then.mockImplementation(function (this: any, resolve: any) {
    resolve({ data, error });
  });
}

async function importRepo() {
  const mod = await import('@/repositories/customer.repository');
  return new mod.CustomerRepository();
}

describe('CustomerRepository', () => {
  it('getAll returns list', async () => {
    const customers = [{ id: '1', name: 'John' }];
    setupData(customers);
    const repo = await importRepo();
    const result = await repo.getAll();
    expect(result).toEqual(customers);
  });

  it('getById returns single customer', async () => {
    const customer = { id: '1', name: 'John' };
    setupData(customer);
    const repo = await importRepo();
    const result = await repo.getById('1');
    expect(result).toEqual(customer);
  });

  it('getById returns null on error', async () => {
    setupData(null, { message: 'not found' });
    const repo = await importRepo();
    const result = await repo.getById('1');
    expect(result).toBeNull();
  });

  it('create inserts and returns customer', async () => {
    const created = { id: '2', name: 'Jane' };
    setupData(created);
    const repo = await importRepo();
    const result = await repo.create({ name: 'Jane' });
    expect(result).toEqual(created);
  });

  it('create throws on error', async () => {
    mockChain.then.mockImplementation(function (this: any, resolve: any) {
      resolve({ data: null, error: { message: 'insert fail' } });
    });
    const repo = await importRepo();
    await expect(repo.create({ name: 'X' })).rejects.toThrow();
  });

  it('update returns updated customer', async () => {
    const updated = { id: '1', name: 'Updated' };
    setupData(updated);
    const repo = await importRepo();
    const result = await repo.update('1', { name: 'Updated' });
    expect(result).toEqual(updated);
  });

  it('delete calls delete chain', async () => {
    setupData(null);
    const repo = await importRepo();
    await expect(repo.delete('1')).resolves.toBeUndefined();
  });

  it('getByEmail returns customer', async () => {
    const customer = { id: '1', email: 'a@b.com' };
    setupData(customer);
    const repo = await importRepo();
    const result = await repo.getByEmail('a@b.com');
    expect(result).toEqual(customer);
  });

  it('count returns number', async () => {
    mockChain.then.mockImplementation(function (this: any, resolve: any) {
      resolve({ data: null, error: null, count: 5 });
    });
    const repo = await importRepo();
    const result = await repo.count();
    expect(result).toBe(5);
  });
});
