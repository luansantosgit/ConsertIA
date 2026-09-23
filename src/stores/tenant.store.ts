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
  currentLanguage: (typeof window !== 'undefined' && (localStorage.getItem('i18nextLng') as Language)) || 'pt-BR',
  setTenant: (tenant) => set({ currentTenant: tenant }),
  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', language);
    }
    set({ currentLanguage: language });
  },
  clear: () => set({ currentTenant: null, currentLanguage: 'pt-BR' }),
}));
