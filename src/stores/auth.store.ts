import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { fetchUserProfile } from '@/repositories/user.repository';

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'technician' | 'attendant';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  initSession: () => Promise<void>;
}

function mapUser(profile: Awaited<ReturnType<typeof fetchUserProfile>>): AuthUser {
  if (!profile) throw new Error('Perfil de usuário não encontrado');
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as UserRole,
    tenantId: profile.tenant_id,
    tenantName: profile.tenant_name ?? '',
    avatar: profile.avatar,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          set({ isLoading: false });
          return { success: false, error: authError.message };
        }

        if (!authData.user) {
          set({ isLoading: false });
          return { success: false, error: 'Usuário não encontrado' };
        }

        const profile = await fetchUserProfile(authData.user.id);
        if (!profile) {
          set({ isLoading: false });
          return { success: false, error: 'Perfil de usuário não encontrado no sistema' };
        }

        const user = mapUser(profile);
        set({ user, isAuthenticated: true, isLoading: false });
        return { success: true };
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (!sessionUser) return;

        const profile = await fetchUserProfile(sessionUser.id);
        if (!profile) return;

        const user = mapUser(profile);
        set({ user, isAuthenticated: true });
      },

      initSession: async () => {
        set({ isLoading: true });
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;

        if (!sessionUser) {
          set({ isLoading: false });
          return;
        }

        const profile = await fetchUserProfile(sessionUser.id);
        if (!profile) {
          set({ isLoading: false });
          return;
        }

        const user = mapUser(profile);
        set({ user, isAuthenticated: true, isLoading: false });
      },
    }),
    {
      name: 'consertia-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
