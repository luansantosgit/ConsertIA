import { create } from 'zustand';
import { AiEntitlementRepository } from '@/repositories/ai-entitlement.repository';
import { useAuthStore } from './auth.store';

// Alerta global de tokens de IA esgotados (cota ≥ 110%) — alimenta
// o balão flutuante em todas as páginas do tenant.
interface AiQuotaAlertState {
  tokensPaused: boolean;
  percent: number;
  checked: boolean;
  checking: boolean;
  check: () => Promise<void>;
  clear: () => void;
}

const repo = new AiEntitlementRepository();
const PAUSE_THRESHOLD = 110;

export const useAiQuotaAlert = create<AiQuotaAlertState>((set, get) => ({
  tokensPaused: false,
  percent: 0,
  checked: false,
  checking: false,

  check: async () => {
    if (get().checking) return;
    const user = useAuthStore.getState().user;
    if (!user || user.role === 'superadmin') {
      set({ checked: true, tokensPaused: false });
      return;
    }
    set({ checking: true });
    try {
      const [entitlement, usage, planLimit] = await Promise.all([
        repo.getEntitlement(),
        repo.getUsage(),
        repo.getPlanLimit().catch(() => 0),
      ]);
      const used = (usage?.tokens_in ?? 0) + (usage?.tokens_out ?? 0);
      const extra = entitlement?.extra_tokens ?? 0;
      const limit = (entitlement?.token_limit_override ?? planLimit) + (extra || 0);
      const pct = limit > 0 ? (used / limit) * 100 : 0;
      set({ percent: pct, tokensPaused: pct >= PAUSE_THRESHOLD, checked: true });
    } catch {
      set({ checked: true, tokensPaused: false });
    } finally {
      set({ checking: false });
    }
  },

  clear: () => set({ tokensPaused: false, percent: 0, checked: true }),
}));
