import { useState, useCallback } from 'react';

export type SyncState = 'idle' | 'syncing' | 'done' | 'error';

/**
 * Hook que controla o fluxo de sincronização de histórico:
 * 1. Lista os chats recentes da instância
 * 2. Solicita history-sync para cada um (mensagens chegam via webhook)
 * 3. Reporta progresso real (chat atual / total)
 */
export function useHistorySync() {
  const [state, setState] = useState<SyncState>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const requestSync = useCallback(async (connectionId: string) => {
    setState('syncing');
    setProgress(0);
    setMessage('Buscando conversas recentes...');

    try {
      const { syncInstanceHistory } = await import('@/lib/api-alternativa.service');
      const result = await syncInstanceHistory(connectionId, 30, (current, total) => {
        const pct = Math.round((current / total) * 100);
        setProgress(pct);
        setMessage(`Sincronizando conversa ${current} de ${total}...`);
      });

      if (!result.success) {
        setState('error');
        setProgress(100);
        setMessage(result.error ?? 'Não foi possível sincronizar o histórico.');
        return;
      }

      setProgress(100);
      setState('done');
      setMessage(
        result.synced === 0
          ? 'Nenhuma conversa anterior encontrada para sincronizar.'
          : `Sincronização solicitada para ${result.synced} conversa(s)! As mensagens estão chegando.`,
      );

      // Volta ao idle depois de 6s
      setTimeout(() => {
        setState('idle');
        setProgress(0);
        setMessage('');
      }, 6000);
    } catch {
      setState('error');
      setProgress(100);
      setMessage('Erro inesperado ao sincronizar.');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setMessage('');
  }, []);

  return { state, progress, message, requestSync, reset };
}
