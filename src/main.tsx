import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './i18n/config';
import { initSentry } from './lib/sentry';
import { initPwaCapture } from './lib/pwa';
import App from './App';

initSentry();

// PWA (Issue #85): captura o beforeinstallprompt ANTES de qualquer componente
// montar (o evento dispara nos primeiros segundos de vida da página).
initPwaCapture();

// Registra o service worker em produção — habilita "Instalar app" no mobile
// e cache de assets com hash.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
