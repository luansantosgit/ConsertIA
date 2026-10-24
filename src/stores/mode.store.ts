import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useThemeStore } from './theme.store';

export type ModePreference = 'light' | 'dark';
const STORAGE_KEY = 'deeperia-mode';

/**
 * Modo de cor do sistema (light/dark) — preferência do USUÁRIO,
 * independente do tema visual do tenant (cores/logo).
 * - Primeira visita: segue a preferência do sistema operacional
 * - Após escolher: persistida no localStorage
 * - Anti-flash: index.html aplica data-theme antes do primeiro paint
 */
interface ModeState {
  mode: ModePreference;
  setMode: (mode: ModePreference) => void;
  toggleMode: () => void;
}

function getInitialMode(): ModePreference {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMode(mode: ModePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Transição suave apenas durante a troca (não afeta hovers depois)
  root.classList.add('mode-transition');
  root.dataset.theme = mode;
  // Re-aplica o tema COMPLETO: recalcula --primary-text/derivadas e troca a
  // logo quando o modo escuro tem logo dedicada (logoDarkMode ativo)
  try {
    useThemeStore.getState().applyTheme();
  } catch { /* tema ainda não carregado */ }
  window.setTimeout(() => root.classList.remove('mode-transition'), 350);
}

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: getInitialMode(),
      setMode: (mode) => {
        set({ mode });
        applyMode(mode);
      },
      toggleMode: () => {
        get().setMode(get().mode === 'dark' ? 'light' : 'dark');
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) applyMode(state.mode);
      },
    },
  ),
);
