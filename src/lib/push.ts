/**
 * Push notifications + Badge para o PWA DeeperIA.
 *
 * - Solicita permissão de notificacao ao navegador
 * - Subscreve o service worker ao servidor de push (VAPID)
 * - Salva a subscription no Supabase via edge function
 * - Atualiza o badge do ícone do app instalado (Badging API)
 *
 * O endpoint e as chaves (p256dh, auth) sao enviados para o backend;
 * a chave privada VAPID NUNCA sai do servidor.
 */

import { supabase } from '@/lib/supabase';
import { isMobilePhone, isStandalonePwa } from '@/lib/pwa';

const SW_PATH = '/sw.js';
// supabase.functions.invoke() recebe o NOME da funcao e monta a URL
// (/functions/v1/<nome>) sozinho. Passar o path inteiro duplica o prefixo
// e a chamada volta 404 "Requested function was not found".
const PUSH_SUBSCRIPTION_FN = 'save-push-subscription';
const PUSH_CONFIG_FN = 'push-config';
export type PushPermissionState = 'default' | 'granted' | 'denied';

/** Cache da chave publica VAPID buscada em runtime (evita round-trips repetidos). */
let cachedVapidKey: string | null = null;

/**
 * Resolve a chave publica VAPID: prior de build (VAPID_PUBLIC_KEY injetada
 * pelo vite define) e cai para runtime via edge function push-config —
 * o bundle de producao pode rodar sem env de build (ex.: Vercel).
 */
async function resolveVapidKey(): Promise<string> {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  if (cachedVapidKey) return cachedVapidKey;
  const { data, error } = await supabase.functions.invoke(PUSH_CONFIG_FN);
  if (error || !data?.vapidPublicKey) {
    throw new Error('VAPID public key nao configurada');
  }
  cachedVapidKey = String(data.vapidPublicKey);
  return cachedVapidKey;
}

/** localStorage que registra que o usuario ATIVOU notificacoes (toggle Sobre). */
export const PUSH_ENABLED_KEY = 'deeperia:push-enabled';

/** Resultado da tentativa de subsricao. */
export interface PushSubscribeResult {
  ok: boolean;
  subscribed: boolean;
  error?: string;
}

/** Retorna o estado atual da permissao de notificacao. */
export function getPushPermissionState(): PushPermissionState {
  if (typeof Notification === 'undefined') return 'default';
  return Notification.permission as PushPermissionState;
}

/** Solicita permissao de notificacao ao usuario. */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (typeof Notification === 'undefined') return 'default';
  const permission = await Notification.requestPermission();
  return permission as PushPermissionState;
}

/** Atualiza (ou limpa) o badge do ícone do app instalado. */
export function setAppBadge(count: number): void {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
  if (count > 0) {
    void navigator.setAppBadge(count);
  } else {
    void navigator.clearAppBadge?.();
  }
}

/** Verifica se o navegador suporta push + service worker. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Push disponivel = celular real + PWA INSTALADO (standalone).
 * Desktop e browser mobile ficam de fora por decisao de produto —
 * as notificacoes sao para o app na tela inicial, estilo WhatsApp.
 */
export function isPushAvailable(): boolean {
  return isPushSupported() && isStandalonePwa() && isMobilePhone();
}

/** O usuario ativou notificacoes neste dispositivo (flag do toggle)? */
export function isPushEnabledByUser(): boolean {
  try {
    return localStorage.getItem(PUSH_ENABLED_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * Subscription push ativa deste dispositivo (null se nao houver).
 * A fonte da verdade do "esta subscribed?" — o flag do localStorage
 * sozinho nao prova nada (a permissao pode ter sido revogada no SO).
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ?? null;
  } catch {
    return null;
  }
}

/**
 * Push REALMENTE ativo neste dispositivo: o navegador concedeu a
 * permissao E existe uma subscription valida no service worker.
 * O toggle da UI usa isto para nao virar uma mascara.
 */
export async function isPushActive(): Promise<boolean> {
  if (getPushPermissionState() !== 'granted') return false;
  return (await getPushSubscription()) !== null;
}

/**
 * Desativa o push neste dispositivo: cancela a subscription no navegador,
 * remove o registro do banco (edge function) e limpa flag + badge.
 */
export async function disablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    localStorage.removeItem(PUSH_ENABLED_KEY);
  } catch {
    // sem storage: segue
  }
  setAppBadge(0);
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return { ok: true };
    // Remove do banco primeiro (request independente do unsubscribe)
    await supabase.functions.invoke(PUSH_SUBSCRIPTION_FN, {
      body: { remove: true, endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao desativar push' };
  }
}

/** Registra o service worker e subscreve ao push, salvando no Supabase. */
export async function subscribePush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, subscribed: false, error: 'Push nao suportado neste navegador' };
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    return { ok: false, subscribed: false, error: 'Permissao negada pelo usuario' };
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    const vapidKey = await resolveVapidKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // Se ja existe subscription com OUTRA chave VAPID (rotacao de chave),
    // ela nao recebe push — o pushManager.subscribe() devolveria a
    // subscription antiga em vez de criar uma nova.
    const existing = await registration.pushManager.getSubscription();
    if (existing && !hasSameVapidKey(existing, applicationServerKey)) {
      await existing.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Salva a subscription via edge function (o tenant vem do JWT no servidor)
    const payload = {
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
    };

    const { error } = await supabase.functions.invoke(PUSH_SUBSCRIPTION_FN, {
      body: payload,
    });

    if (error) {
      return { ok: false, subscribed: false, error: error.message };
    }

    // Flag para o toggle do modal "Sobre" (voltar a ativar depois)
    try {
      localStorage.setItem(PUSH_ENABLED_KEY, 'on');
    } catch {
      // sem storage: subscription salva mesmo assim
    }

    return { ok: true, subscribed: true };
  } catch (err) {
    return {
      ok: false,
      subscribed: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido ao subscrever',
    };
  }
}

/** Converte uma chave VAPID base64 URL para Uint8Array (requisito do PushManager). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  if (!base64String) throw new Error('VAPID public key nao configurada');
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * A subscription usa a mesma chave VAPID da atual?
 * Quando o navegador nao expoe `options.applicationServerKey`, assumimos
 * que sim — nunca destruimos uma subscription valida por falta de info.
 */
function hasSameVapidKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array,
): boolean {
  const current = subscription.options?.applicationServerKey;
  if (!current) return true;
  const bytes = new Uint8Array(current);
  if (bytes.length !== applicationServerKey.length) return false;
  return bytes.every((byte, index) => byte === applicationServerKey[index]);
}
