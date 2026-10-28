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
