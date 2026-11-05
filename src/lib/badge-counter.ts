/**
 * Contador do badge do icone do app, mantido em IndexedDB e
 * compartilhado entre a pagina e o service worker (mesmo db
 * `deeperia-push`, store `badge` — schema em sincronia com sw.js).
 *
 * Papel (Issue #93): quando o app FECHA, quem responde ao push e o SW.
 * O contador guarda "o valor que a pagina deixou" e o SW soma cada
 * push novo. Quando a pagina reaparece, recalcula o unread real e
 * grava de volta — nunca diverge por muito tempo.
 *
 * A pagina so deve gravar o valor REAL (unread do banco): e a fonte
 * de verdade que reinicia o contador.
 */

import { BADGE_STORE, DB_VERSION, RECEIPT_DB } from '@/lib/push-receipts';

/** Evento que a pagina dispara quando o unread muda (realtime/leitura). */
export const UNREAD_CHANGED_EVENT = 'deeperia:unread-changed';

export const BADGE_COUNT_KEY = 'count';
export const BADGE_MAX = 99;

function openBadgeDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(RECEIPT_DB, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('receipts')) {
          req.result.createObjectStore('receipts', { keyPath: 'conv' });
        }
        if (!req.result.objectStoreNames.contains(BADGE_STORE)) {
          req.result.createObjectStore(BADGE_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Valor que a pagina/SW deixou guardado (null = nunca gravado). */
export async function getBadgeCount(): Promise<number | null> {
  const db = await openBadgeDb();
  if (!db) return null;
  const value = await new Promise<{ key: string; n: number } | undefined>((resolve) => {
    try {
      const req = db
        .transaction(BADGE_STORE, 'readonly')
        .objectStore(BADGE_STORE)
        .get(BADGE_COUNT_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }).finally(() => db.close());

  return typeof value?.n === 'number' ? value.n : null;
}

/** Grava o valor real do unread (fonte de verdade da pagina). */
export async function setBadgeCount(n: number): Promise<void> {
  const db = await openBadgeDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BADGE_STORE, 'readwrite');
      tx.objectStore(BADGE_STORE).put({ key: BADGE_COUNT_KEY, n });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Melhor esforco: badge nao e critico
  } finally {
    db.close();
  }
}
