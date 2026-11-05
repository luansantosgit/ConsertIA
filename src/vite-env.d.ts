/// <reference types="vite/client" />

/**
 * Versão do app, injetada pelo Vite a partir do `package.json`
 * (`define.__APP_VERSION__` em `vite.config.ts`).
 */
declare const __APP_VERSION__: string;

/**
 * Chave pública VAPID para push notifications, injetada pelo Vite
 * (`define.VAPID_PUBLIC_KEY` em `vite.config.ts`).
 */
declare const VAPID_PUBLIC_KEY: string;
