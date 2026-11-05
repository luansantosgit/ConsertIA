/**
 * Serviço de notificação push — CANAL-AGNÓSTICO.
 *
 * Qualquer canal (WhatsApp/Uazapi, Agenda, Ordens de Serviço, Ligações,
 * Asaas...) dispara push chamando `sendPush` SEM conhecer VAPID, cripto-
 * grafia ou subscriptions. Toda a complexidade vive em
 * `send-push-notification` (edge function) + `_shared/push.ts`.
 *
 * Contrato: payload genérico com `kind` para o SW/cliente decidir
 * comportamento (badge, rota de destino) e `data` livre para extensões
 * futuras de cada canal.
 */

export type PushKind = 'message' | 'appointment' | 'os' | 'billing' | 'custom';

export interface PushPayload {
  /** Tenant destinatário (subscriptions filtradas por ele). */
  tenantId: string;
  /** Título da notificação (ex.: nome do cliente). */
  title: string;
  /** Corpo/preview da notificação. */
  body: string;
  /** Tipo de evento — novos canais podem adicionar valores ao tipo. */
  kind?: PushKind;
  /** Conversa a abrir ao tocar (quando aplicável). */
  conversationId?: string;
  /** Rota de destino ao tocar na notificação (default: /atendimento). */
  url?: string;
  /** Dados extras específicos do canal (transparentes para o push). */
  data?: Record<string, unknown>;
}

/**
 * Dispara o push para todos os dispositivos da tenant.
 * Fire-and-forget seguro: nunca lança — falhas ficam em console.warn
 * para não derrubar o fluxo do canal chamador.
 */
export async function sendPush(payload: PushPayload): Promise<void> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[push] send-push-notification respondeu ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.warn("[push] falha ao disparar push:", (err as Error).message);
  }
}
