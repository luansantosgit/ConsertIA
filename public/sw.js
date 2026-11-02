/* DeeperIA — Service Worker (Issue #85: PWA instalável)
   Estratégia CONSERVADORA para não atrapalhar realtime (Supabase) nem
   deployments: só intercepta assets do próprio origin com hash imutável
   (stale-while-revalidate). index.html e API sempre network-first. */

const CACHE = 'deeperia-assets-v1';
const ASSET_PREFIX = '/assets/';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fontes etc: bypass
  if (!url.pathname.startsWith(ASSET_PREFIX)) return; // só chunks com hash

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      return cached || fetchPromise;
    }),
  );
});

/* ── PUSH NOTIFICATIONS ──
   Recebe um push do serviço de notificações (canal-agnóstico) e exibe
   uma notificação com preview da mensagem e ícone da marca. Ao clicar,
   abre a rota destino (data.url) e limpa o badge.

   Contrato do payload (send-push-notification):
   { title, body, kind?, conversationId?, url?, data? }

   Dedupe (Issue #92): o push e a notificação local da página (realtime)
   compartilham recibos em IndexedDB (mesmo schema de src/lib/push-receipts.ts)
   para nunca exibir banner duplicado da mesma conversa. Quando o app
   está VISÍVEL, o banner é suprimido — o usuário já está vendo o chat. */

const RECEIPT_DB = 'deeperia-push';
const RECEIPT_STORE = 'receipts';
const RECEIPT_WINDOW_MS = 15000;

function openReceiptDb() {
  return new Promise(resolve => {
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

function stampReceipt(convKey, source) {
  return openReceiptDb().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(RECEIPT_STORE, 'readwrite');
      const store = tx.objectStore(RECEIPT_STORE);
      const get = store.get(convKey);
      get.onsuccess = () => {
        const record = get.result || { conv: convKey };
        record[source] = Date.now();
        store.put(record);
      };
    } catch { /* melhor esforço */ }
    setTimeout(() => { try { db.close(); } catch { /* ignora */ } }, 0);
  });
}

function hasRecentReceipt(convKey, other) {
  return openReceiptDb().then(db => {
    if (!db) return false;
    return new Promise(resolve => {
      let settled = false;
      const done = value => { if (!settled) { settled = true; resolve(!!value); } };
      try {
        const req = db.transaction(RECEIPT_STORE, 'readonly').objectStore(RECEIPT_STORE).get(convKey);
        req.onsuccess = () => {
          const t = req.result && req.result[other];
          done(typeof t === 'number' && Date.now() - t < RECEIPT_WINDOW_MS);
        };
        req.onerror = () => done(false);
      } catch {
        done(false);
      }
      setTimeout(() => done(false), 500);
      setTimeout(() => { try { db.close(); } catch { /* ignora */ } }, 600);
    });
  });
}

function getAppVisible() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => clients.some(c => c.visibilityState === 'visible'));
}

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const kind = data.kind || 'custom';
  const convKey = data.conversationId || data.url || kind || 'default';

  event.waitUntil(
    (async () => {
      // App visível = usuário já está vendo o chat: sem banner (e o
      // realtime da página não dispara notificação local nesse estado)
      if (kind === 'message' && (await getAppVisible())) return;

      // Notificação local (realtime da página) já avisou essa conversa
      if (await hasRecentReceipt(convKey, 'local')) return;
      await stampReceipt(convKey, 'push');

      const title = data.title || 'DeeperIA';
      const options = {
        body: data.body || 'Nova mensagem',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
          kind,
          conversationId: data.conversationId,
          url: data.url || '/atendimento',
          extra: data.data || {},
        },
        actions: [
          { action: 'abrir', title: 'Abrir' },
        ],
        requireInteraction: false,
        silent: false,
        tag: data.conversationId || kind || 'default',
        renotify: false,
      };
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const { url } = event.notification.data || {};
  const target = url || '/atendimento';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Ja existe uma aba aberta? Foca nela.
      for (const client of clients) {
        if (client.url.includes(new URL(target, self.location.origin).pathname)) {
          return client.focus();
        }
      }
      // Senao, abre uma nova aba.
      return self.clients.openWindow(target);
    }).then(() => {
      // Limpa o badge do SO ao abrir o app (o app recalcula ao montar)
      if (self.navigator.clearAppBadge) self.navigator.clearAppBadge();
    }),
  );
});
