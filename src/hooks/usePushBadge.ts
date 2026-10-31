import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { setAppBadge, isPushSupported } from '@/lib/push';

/**
 * Hook que mantem o badge do ícone do app atualizado com o total
 * de conversas com mensagens nao lidas (estilo WhatsApp).
 *
 * Busca o count no Supabase e chama navigator.setAppBadge(n)
 * (ou clearAppBadge() quando zero). Chame `refresh` ao receber um push,
 * ao marcar conversa como lida ou em eventos realtime.
 */
export function usePushBadge() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const repo = useMemo(() => new ConversationRepository(), []);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    try {
      const n = await repo.getUnreadCount();
      setCount(n);
      setAppBadge(n);
    } catch {
      // Falha silenciosa: badge nao e critico
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, loading, refresh };
}
