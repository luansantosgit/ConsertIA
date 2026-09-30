import { create } from 'zustand';
import { SubscriptionRepository } from '@/repositories/subscription.repository';
import { canAccess } from '@/lib/permissions';
import { useAuthStore } from './auth.store';

// Alerta global de fatura vencida — alimenta o badge do menu
// Assinatura, a notificação flutuante e o bloqueio do sistema
// (após carência expirada, só a página Assinatura abre).
interface SubscriptionAlertState {
  hasOverdue: boolean;
  dueSoon: boolean;
  blocked: boolean;
  checked: boolean;
  checking: boolean;
  check: () => Promise<void>;
  clear: () => void;
}

export const useSubscriptionAlert = create<SubscriptionAlertState>((set, get) => ({
  hasOverdue: false,
  dueSoon: false,
  blocked: false,
  checked: false,
  checking: false,

  check: async () => {
    if (get().checking) return;
    const user = useAuthStore.getState().user;
    if (!user || !canAccess(user, 'financeiro')) {
      set({ checked: true, hasOverdue: false, dueSoon: false, blocked: false });
      return;
    }
    set({ checking: true });
    try {
      const repo = new SubscriptionRepository();
      const overview = await repo.getOverview();
      set({
        hasOverdue: !!overview.has_overdue,
        dueSoon: !!overview.due_today,
        blocked: !!overview.subscription?.blocked,
        checked: true,
      });
    } catch {
      set({ checked: true, hasOverdue: false, dueSoon: false, blocked: false });
    } finally {
      set({ checking: false });
    }
  },

  clear: () => set({ hasOverdue: false, dueSoon: false, blocked: false, checked: false }),
}));
