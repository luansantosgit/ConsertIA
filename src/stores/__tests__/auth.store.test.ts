import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/repositories/user.repository', () => ({
  fetchUserProfile: vi.fn(),
}));

function resetStore() {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe('auth.store', () => {
  it('starts with default state', () => {
    const { user, isAuthenticated, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false);
  });

  it('login succeeds with valid credentials', async () => {
    const { supabase } = await import('@/lib/supabase');
    const { fetchUserProfile } = await import('@/repositories/user.repository');

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1' } as any, session: {} as any },
      error: null,
    });
    vi.mocked(fetchUserProfile).mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', role: 'admin',
      tenant_id: 't1', tenant_name: 'Tenant',
    });

    const result = await useAuthStore.getState().login('a@b.com', 'pass');
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('a@b.com');
  });

  it('login fails on auth error', async () => {
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Bad credentials' } as any,
    });

    const result = await useAuthStore.getState().login('a@b.com', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Bad credentials');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login fails when profile not found', async () => {
    const { supabase } = await import('@/lib/supabase');
    const { fetchUserProfile } = await import('@/repositories/user.repository');

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1' } as any, session: {} as any },
      error: null,
    });
    vi.mocked(fetchUserProfile).mockResolvedValue(null);

    const result = await useAuthStore.getState().login('a@b.com', 'pass');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Perfil');
  });

  it('logout clears state and calls signOut', async () => {
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    useAuthStore.setState({ user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin', tenantId: 't1', tenantName: 'T' }, isAuthenticated: true });

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('initSession sets user when session exists', async () => {
    const { supabase } = await import('@/lib/supabase');
    const { fetchUserProfile } = await import('@/repositories/user.repository');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } as any },
      error: null,
    });
    vi.mocked(fetchUserProfile).mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', role: 'admin',
      tenant_id: 't1', tenant_name: 'Tenant',
    });

    await useAuthStore.getState().initSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('initSession stays unauthenticated when no session', async () => {
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await useAuthStore.getState().initSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
