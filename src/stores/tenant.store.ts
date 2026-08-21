import { create } from 'zustand';
import type { Tenant, Language } from '@/types';

interface TenantState {
  currentTenant: Tenant | null;
  currentLanguage: Language;
  setTenant: (tenant: Tenant | null) => void;
  setLanguage: (language: Language) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: null,
  currentLanguage: 'pt-BR',
  setTenant: (tenant) => set({ currentTenant: tenant }),
  setLanguage: (language) => set({ currentLanguage: language }),
  clear: () => set({ currentTenant: null, currentLanguage: 'pt-BR' }),
}));
