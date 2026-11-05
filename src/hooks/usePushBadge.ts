import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { setAppBadge, isPushAvailable } from '@/lib/push';
import { setBadgeCount, UNREAD_CHANGED_EVENT } from '@/lib/badge-counter';

/**
 * Hook que mantem o badge do ícone do app atualizado com o total
 * de conversas com mensagens nao lidas (estilo WhatsApp).
 *
 * Busca o count no Supabase e chama navigator.setAppBadge(n)
 * (ou clearAppBadge() quando zero). Chame `refresh` ao receber um push,
 * ao marcar conversa como lida ou em eventos realtime.
 *
 * Quando a pagina seta o valor, grava no contador IDB (badge-counter):
 * e esse valor que o service worker usa como base para incrementar
 * nos pushes com o app FECHADO (uso compartilhado, veja Issue #93).
 */
export function usePushBadge() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const repo = useMemo(() => new ConversationRepository(), []);

  const refresh = useCallback(async () => {
    if (!isPushAvailable()) return;
    setLoading(true);
    try {
      const n = await repo.getUnreadCount();
      setCount(n);
      setAppBadge(n);
      await setBadgeCount(n);
    } catch {
      // Falha silenciosa: badge nao e critico
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Pagina em background ainda recebe realtime: badge follow-up sem 100%
  // depender do SW (que so incrementa quando exibe o banner).
  useEffect(() => {
    const onUnreadChanged = () => {
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener(UNREAD_CHANGED_EVENT, onUnreadChanged);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(UNREAD_CHANGED_EVENT, onUnreadChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { count, loading, refresh };
}
