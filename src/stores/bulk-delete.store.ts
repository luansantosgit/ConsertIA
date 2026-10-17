import { create } from 'zustand';

/**
 * Exclusão em massa global: o progresso vive no store — o modal fecha
 * na hora e um balão flutuante acompanha em todas as páginas. No chat
 * (/atendimento) o balão só aparece quando termina (para não atrapalhar
 * o atendente), com um OK para dispensar.
 */
interface BulkDeleteState {
  status: 'idle' | 'running' | 'done';
  done: number;
  total: number;
  start: (total: number) => void;
  tick: (done: number) => void;
  finish: () => void;
  dismiss: () => void;
}

export const useBulkDeleteStore = create<BulkDeleteState>()((set) => ({
  status: 'idle',
  done: 0,
  total: 0,
  start: (total) => set({ status: 'running', done: 0, total }),
  tick: (done) => set({ done }),
  finish: () => set({ status: 'done' }),
  dismiss: () => set({ status: 'idle', done: 0, total: 0 }),
}));
