/**
 * Notificacao LOCAL (sem servidor) para mensagens recebidas pelo
 * realtime com o app NAO visivel — o push FCM so cobre o app 100%
 * fechado; quando o painel esta vivo em background/tela bloqueada,
 * e o realtime entrega a mensagem e aqui que o banner nasce.
 *
 * Regras de produto: APENAS PWA mobile (`isPushAvailable()`), com
 * permissao concedida, e somente quando `document.hidden` — quem esta
 * olhando o app nao precisa de banner (badge/JA VIU no chat).
 *
 * Dedupe: o SW estampa recibo quando entrega push do servidor; se o
 * mesmo caminho avisar o banner, na mesma conversa, o push do servidor
 * tambem chega. Janela de dedupe em `push-receipts.ts`.
 */

import { getPushPermissionState, isPushAvailable } from '@/lib/push';
import { hasRecentReceipt, stampReceipt } from '@/lib/push-receipts';

export interface IncomingNotice {
  /** Conversa que recebeu a mensagem (roteamento ao clicar). */
  conversationId: string;
  /** Nome do contato / conversa (titulo do banner). */
  title: string;
  /** Preview da mensagem (corpo do banner). */
  body: string;
}

/** Dispara o banner localmente. Fire-and-forget: falhas sao silenciosas. */
export async function notifyIncomingMessage(notice: IncomingNotice): Promise<void> {
  try {
    if (!notice.conversationId) return;
    if (!document.hidden) return; // usuario esta olhando o app
    if (!isPushAvailable()) return; // product rule: so PWA mobile
    if (getPushPermissionState() !== 'granted') return;
    if (await hasRecentReceipt(notice.conversationId, 'push')) return; // push do servidor ja avisou
    await stampReceipt(notice.conversationId, 'local');

    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.showNotification(notice.title || 'DeeperIA', {
      body: notice.body || 'Nova mensagem',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        kind: 'message',
        conversationId: notice.conversationId,
        url: '/atendimento',
        extra: {},
      },
      tag: notice.conversationId,
      renotify: false,
      requireInteraction: false,
    } as NotificationOptions); // renotify: valido em browsers, ausente no lib.dom
  } catch {
    // Sem banner nunca derruba o realtime/chat
  }
}
