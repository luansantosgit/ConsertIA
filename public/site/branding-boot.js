/* DeeperIA — boot de branding (incluir no <head> de todas as páginas do site).
 * Aplica a logo/favicon do sistema ANTES da primeira pintura, usando cache
 * local para eliminar o flash de fallback. O fetch da configuração começa
 * aqui; o site.js reutiliza a mesma promise (sem requisição duplicada). */

(function () {
  var KEY = 'deeperia:branding';
  var ENDPOINT = 'https://sknimzjwpdbcuutxbycq.supabase.co/functions/v1/landing-lead';

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function apply(b) {
    if (!b) return;

    if (b.logo_url) {
      document.querySelectorAll('img.brand-logo, img.hero-logo-img').forEach(function (img) {
        img.src = b.logo_url;
        img.style.display = '';
      });
      document.querySelectorAll('.brand .brand-mark, .brand [data-brand-text], .hero-logo-fallback').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    if (b.logo_text) {
      document.querySelectorAll('[data-brand-text]').forEach(function (el) {
        el.textContent = b.logo_text;
      });
    }

    if (b.favicon_url) {
      var fav = document.querySelector('link[rel="icon"]');
      if (fav) fav.href = b.favicon_url;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(readCache());
  });

  window.__DIA_CONFIG_READY = fetch(ENDPOINT)
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (cfg && cfg.branding) {
        try {
          localStorage.setItem(KEY, JSON.stringify(cfg.branding));
        } catch (e) { /* storage cheio/bloqueado: aplica sem cache */ }
        apply(cfg.branding);
      }
      return cfg;
    })
    .catch(function () { return null; });
})();
