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
   está VISÍVEL, o banner é suprimido — o usuário já está vendo o chat.

   Badge (Issue #93): o contador vive no IndexedDB (store `badge`) e é
   COMPARTILHADO com a página (src/lib/badge-counter.ts — mesmo schema,
   manter em sincronia). A página grava o unread real quando recalcula;
   este SW soma +1 a cada banner mostrado com o app fechado e chama
   navigator.setAppBadge. Schema: db `deeperia-push` v2, store `badge`,
   keyPath `key`, registro { key: 'count', n }. */

const RECEIPT_DB = 'deeperia-push';
const RECEIPT_STORE = 'receipts';
const BADGE_STORE = 'badge';
const BADGE_COUNT_KEY = 'count';
const BADGE_MAX = 99;
const DB_VERSION = 2;
const RECEIPT_WINDOW_MS = 15000;

function openPersistDb() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(RECEIPT_DB, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(RECEIPT_STORE)) {
          req.result.createObjectStore(RECEIPT_STORE, { keyPath: 'conv' });
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

function stampReceipt(convKey, source) {
  return openPersistDb().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(RECEIPT_STORE, 'readwrite');
      const get = tx.objectStore(RECEIPT_STORE).get(convKey);
      get.onsuccess = () => {
        const record = get.result || { conv: convKey };
        record[source] = Date.now();
        tx.objectStore(RECEIPT_STORE).put(record);
      };
    } catch { /* melhor esforço */ }
    setTimeout(() => { try { db.close(); } catch { /* ignora */ } }, 0);
  });
}

function hasRecentReceipt(convKey, other) {
  return openPersistDb().then(db => {
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

/** Lê o contador da página (unread real quando ela esteve aberta por último). */
function getBadgeCount() {
  return openPersistDb().then(db => {
    if (!db) return 0;
    return new Promise(resolve => {
      let settled = false;
      const done = value => {
        if (!settled) { settled = true; resolve(typeof value === 'number' ? value : 0); }
      };
      try {
        const req = db.transaction(BADGE_STORE, 'readonly').objectStore(BADGE_STORE).get(BADGE_COUNT_KEY);
        req.onsuccess = () => done(req.result && req.result.n);
        req.onerror = () => done(0);
      } catch {
        done(0);
      }
      setTimeout(() => done(0), 500);
      setTimeout(() => { try { db.close(); } catch { /* ignora */ } }, 600);
    });
  });
}

/** Grava o novo contador e aplica o badge do SO (Badging API no SW). */
function applyBadgeCount(n) {
  return openPersistDb().then(db => {
    if (db) {
      try {
        const tx = db.transaction(BADGE_STORE, 'readwrite');
        tx.objectStore(BADGE_STORE).put({ key: BADGE_COUNT_KEY, n });
      } catch { /* melhor esforço */ }
      setTimeout(() => { try { db.close(); } catch { /* ignora */ } }, 0);
    }
    try {
      if (n > 0 && self.navigator.setAppBadge) {
        self.navigator.setAppBadge(n).catch(() => {});
      }
    } catch { /* iOS nao suporta Badging: sem efeito */ }
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
      // App visível = usuário já está vendo o chat: sem banner nem badge
      // (a página rege o contador via realtime e unread real)
      if (kind === 'message' && (await getAppVisible())) return;

      // Notificação local (realtime da página) já avisou essa conversa
      if (await hasRecentReceipt(convKey, 'local')) return;

      // Banner vai sair: soma no contador e aplica o badge do SO
      const bump = kind === 'message'
        ? getBadgeCount().then(n => applyBadgeCount(Math.min(n + 1, BADGE_MAX)))
        : Promise.resolve();
      await stampReceipt(convKey, 'push');
      await bump;

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
      // Limpa o badge do SO ao abrir o app (a pagina recalcula ao montar
      // e regrava o contador com o unread real)
      if (self.navigator.clearAppBadge) self.navigator.clearAppBadge();
    }),
  );
});
