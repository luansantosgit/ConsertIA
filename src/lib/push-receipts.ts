/**
 * Recibos de notificacao (IndexedDB) compartilhados entre a pagina e o
 * service worker (o mesmo banco `deeperia-push`, store `receipts`).
 *
 * Servem para o dedupe cruzado: quando o push do servidor (SW) e a
 * notificacao local (pagina, via realtime) tratam a MESMA mensagem, o
 * segundo a chegar deve pular o banner — nunca mostrar duplicado.
 *
 * O service worker tem sua propria implementacao em sw.js (nao importa
 * modulos) — manter o schema em sincronia: db `deeperia-push`,
 * store `receipts`, keyPath `conv`, indices t/source.
 */

export const RECEIPT_DB = 'deeperia-push';
export const RECEIPT_STORE = 'receipts';
export const RECEIPT_WINDOW_MS = 15_000;

export type ReceiptSource = 'push' | 'local';

interface ReceiptRecord {
  conv: string;
  push?: number;
  local?: number;
}

function openReceiptDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(RECEIPT_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(RECEIPT_STORE)) {
          req.result.createObjectStore(RECEIPT_STORE, { keyPath: 'conv' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<unknown> | void,
): Promise<void> {
  const db = await openReceiptDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECEIPT_STORE, mode);
      const store = tx.objectStore(RECEIPT_STORE);
      const result = fn(store);
      if (result && 'onsuccess' in result) {
        (result as IDBRequest).onsuccess = () => resolve();
        (result as IDBRequest).onerror = () => reject((result as IDBRequest).error);
      } else {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }
    });
  } catch {
    // Falha silenciosa: sem recibo o pior caso e um banner duplicado raro
  } finally {
    db.close();
  }
}

/** Registra que ESTA origem (push do SW ou local da pagina) notificou a conversa agora. */
export async function stampReceipt(conversationId: string, source: ReceiptSource): Promise<void> {
  await withStore('readwrite', (store) => {
    const get = store.get(conversationId);
    get.onsuccess = () => {
      const record: ReceiptRecord = (get.result as ReceiptRecord) ?? { conv: conversationId };
      record[source] = Date.now();
      store.put(record);
    };
    get.onerror = () => {
      store.put({ conv: conversationId, [source]: Date.now() });
    };
  });
}

/** A OUTRA origem notificou esta conversa dentro da janela de dedupe? */
export async function hasRecentReceipt(
  conversationId: string,
  other: ReceiptSource,
): Promise<boolean> {
  const db = await openReceiptDb();
  if (!db) return false;
  const value = await new Promise<ReceiptRecord | undefined>((resolve) => {
    try {
      const req = db
        .transaction(RECEIPT_STORE, 'readonly')
        .objectStore(RECEIPT_STORE)
        .get(conversationId);
      req.onsuccess = () => resolve(req.result as ReceiptRecord | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }).finally(() => db.close());

  const t = value?.[other];
  return typeof t === 'number' && Date.now() - t < RECEIPT_WINDOW_MS;
}
