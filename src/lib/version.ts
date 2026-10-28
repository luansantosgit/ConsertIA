/**
 * Versão atual do app.
 *
 * O valor vem do `package.json` e é injetado no build pelo Vite
 * (`define.__APP_VERSION__`). O fallback existe apenas em testes,
 * onde o global não é definido.
 */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

/** Versão pronta para exibição: `v1.0.100`. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
