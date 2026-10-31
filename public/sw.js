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
      const network = fetch(req)
        .then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/* ── PUSH NOTIFICATIONS ──
   Recebe um push do serviço de notificações (canal-agnóstico) e exibe
   uma notificação com preview da mensagem e ícone da marca. Ao clicar,
   abre a rota destino (data.url) e limpa o badge.

   Contrato do payload (send-push-notification):
   { title, body, kind?, conversationId?, url?, data? }
*/
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'DeeperIA';
  const options = {
    body: data.body || 'Nova mensagem',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      kind: data.kind || 'custom',
      conversationId: data.conversationId,
      url: data.url || '/atendimento',
      extra: data.data || {},
    },
    actions: [
      { action: 'abrir', title: 'Abrir' },
    ],
    requireInteraction: false,
    silent: false,
    tag: data.conversationId || data.kind || 'default',
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
      if ('clearAppBadge' in self.navigator) {
        void self.navigator.clearAppBadge();
      }
    }),
  );
});
