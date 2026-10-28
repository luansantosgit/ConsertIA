/**
 * Recuperação de "chunk stale" após deploy.
 *
 * Quando a Vercel publica um build novo, o index.html aberto na sessão
 * continua referenciando chunks com hash antigo que retornam 404 —
 * "Failed to fetch dynamically imported module". A solução é recarregar
 * a página (network-first no index.html traz o build novo) e limpar os
 * caches do service worker para não reaproveitar assets velhos.
 */

const CHUNK_RELOAD_KEY = 'chunk-reload-ts';
const RELOAD_COOLDOWN_MS = 60_000;

/** Mensagens conhecidas de falha ao carregar chunk dinâmico. */
const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'dynamically imported module',
  'ChunkLoadError',
  'Loading CSS chunk',
];

export const isChunkLoadError = (error: unknown): boolean => {
  const message = (error as Error)?.message ?? String(error);
  return CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
};

/** Remove todos os caches do service worker (best effort). */
export const clearRuntimeCaches = (): void => {
  if (typeof caches === 'undefined') return;
  caches.keys()
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(() => {});
};

/**
 * Recarrega a página para buscar o build novo. Guarda de 1 reload por
 * minuto para evitar loop caso o problema persista.
 */
export const recoverChunkError = (): boolean => {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
  const now = Date.now();
  if (last && now - last <= RELOAD_COOLDOWN_MS) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  clearRuntimeCaches();
  window.location.reload();
  return true;
};
