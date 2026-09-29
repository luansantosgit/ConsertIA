import { supabase } from '@/lib/supabase';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { TenantSettingsRepository } from '@/repositories/tenant-settings.repository';
import { useAuthStore } from '@/stores/auth.store';
import type { ServiceOrderStatus, Conversation } from '@/types';

export interface StageAutoMessage {
  enabled: boolean;
  message: string;
  /** Apenas para o estágio Aguardando Aprovação: envia o PDF da OS junto. Padrão true. */
  sendPdf?: boolean;
}

export type KanbanAutoMessages = Partial<Record<ServiceOrderStatus, StageAutoMessage>>;

const SETTINGS_KEY = 'kanban_auto_messages';
const SEND_DELAY_MS = 10_000;

/** Mensagem padrão de cada coluna do kanban — usada quando o usuário não personalizou (ou apagou) o texto. */
export const DEFAULT_STAGE_MESSAGES: Record<ServiceOrderStatus, string> = {
  pending: 'Olá! Recebemos seu equipamento e a OS já está registrada por aqui. Vamos analisar e te mantemos informado. 🔧',
  diagnosis: 'Seu aparelho entrou em análise! Nossos técnicos estão verificando o problema e logo te damos um retorno. 🔍',
  awaiting_approval: 'A análise do seu aparelho ficou pronta! Dá uma olhada no orçamento e me confirma se podemos seguir com o reparo. 😊',
  approved: 'Aprovação recebida, obrigado! Vamos preparar tudo para o reparo do seu aparelho. ✅',
  awaiting_part: 'Já estamos providenciando a peça do seu aparelho! Te avisamos assim que ela chegar para começar o reparo. 📦',
  in_progress: 'O reparo do seu aparelho começou! Te atualizamos por aqui assim que tivermos novidades. 🔧',
  completed: 'Prontinho! O reparo do seu aparelho foi concluído. ✅',
  ready: 'Seu aparelho está pronto para retirada! 🎉 Pode vir buscar quando preferir, dentro do nosso horário de atendimento.',
  cancelled: 'Sua OS foi cancelada. Se mudar de ideia, é só falar com a gente. 😉',
};

/** Aguardando Aprovação: o padrão depende do envio do PDF — com PDF fala do orçamento; sem PDF é status genérico. */
const AWAITING_APPROVAL_WITHOUT_PDF = 'Atualizamos o Status do seu serviço! Te informaremos aqui a cada nova atualização...';

export function defaultStageMessage(status: ServiceOrderStatus, sendPdf: boolean): string {
  if (status === 'awaiting_approval' && !sendPdf) return AWAITING_APPROVAL_WITHOUT_PDF;
  return DEFAULT_STAGE_MESSAGES[status];
}

/**
 * Resolve a mensagem de um estágio:
 * - configuração inexistente → padrão (ativo)
 * - enabled === false explicitamente → desativado (respeita a escolha)
 * - mensagem vazia/apagada → padrão (no Ag. Aprovação, conforme o toggle de PDF)
 */
export function resolveStageMessage(status: ServiceOrderStatus, config?: StageAutoMessage): { enabled: boolean; message: string; sendPdf: boolean } {
  if (config && config.enabled === false) return { enabled: false, message: config.message, sendPdf: false };
  const sendPdf = status === 'awaiting_approval' ? config?.sendPdf !== false : false;
  const message = config?.message?.trim() || defaultStageMessage(status, sendPdf);
  return { enabled: !!message, message, sendPdf };
}

export async function loadKanbanAutoMessages(): Promise<KanbanAutoMessages> {
  try {
    const raw = await new TenantSettingsRepository().getValue(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as KanbanAutoMessages;
    // Mensagem idêntica ao padrão = não é personalização: zera para manter o fallback/placeholder
    const normalized = {} as KanbanAutoMessages;
    for (const [status, cfg] of Object.entries(parsed)) {
      if (cfg) normalized[status as ServiceOrderStatus] = normalizeConfig(status as ServiceOrderStatus, cfg);
    }
    return normalized;
  } catch (err) {
    console.error('Failed to load kanban auto messages:', err);
    return {};
  }
}

function normalizeConfig(status: ServiceOrderStatus, cfg: StageAutoMessage): StageAutoMessage {
  const msg = cfg.message?.trim() ?? '';
  if (!msg) return cfg;
  const defaults = [DEFAULT_STAGE_MESSAGES[status]];
  if (status === 'awaiting_approval') defaults.push(AWAITING_APPROVAL_WITHOUT_PDF);
  if (defaults.some(d => d === msg)) return { ...cfg, message: '' };
  return cfg;
}

export async function saveKanbanAutoMessages(config: KanbanAutoMessages): Promise<void> {
  const normalized = {} as KanbanAutoMessages;
  for (const [status, cfg] of Object.entries(config)) {
    if (cfg) normalized[status as ServiceOrderStatus] = normalizeConfig(status as ServiceOrderStatus, cfg);
  }
  await new TenantSettingsRepository().setValue(SETTINGS_KEY, JSON.stringify(normalized));
}

export interface AutoMessageTarget {
  conversationId?: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
  osId?: string;
}

// Agenda via DB: o disparo nao depende mais do navegador ficar aberto.
// O navegador processa em 10s (primario); o pg_cron + Edge Function cobre o fallback.
export async function scheduleStageAutoMessage(
  status: ServiceOrderStatus,
  target: AutoMessageTarget,
  config?: StageAutoMessage
): Promise<void> {
  const resolved = resolveStageMessage(status, config);
  if (!resolved.enabled || !resolved.message.trim()) return;
  try {
    const convRepo = new ConversationRepository();
    let conversationId = target.conversationId || null;
    let phone = target.customerPhone;
    if (!phone && conversationId) {
      const conv = await convRepo.getById(conversationId);
      phone = conv?.contact_phone;
      conversationId = conv?.id || conversationId;
    }
    if (!phone) {
      console.warn('[auto-message] Cliente da OS sem telefone — disparo ignorado');
      return;
    }

    const tenantId = useAuthStore.getState().user?.tenantId || '';

    // Ag. Aprovação com PDF: dispara SOMENTE o PDF com a mensagem como legenda.
    // Se o envio do PDF falhar, cai para a mensagem de texto (nunca fica sem aviso).
    if (resolved.sendPdf && target.osId) {
      window.setTimeout(async () => {
        const m = await import('@/lib/os-pdf.service');
        const ok = await m.sendOsPdfToLead(target.osId!, phone, resolved.message);
        if (!ok) {
          await queueText({
            tenantId,
            conversationId,
            customerId: target.customerId,
            customerName: target.customerName,
            phone,
            content: resolved.message,
          });
        }
      }, SEND_DELAY_MS);
      return;
    }

    await queueText({
      tenantId,
      conversationId,
      customerId: target.customerId,
      customerName: target.customerName,
      phone,
      content: resolved.message,
    });
  } catch (err) {
    console.error('Failed to schedule stage auto message:', err);
  }
}

// Insere a mensagem na fila no banco (navegador processa em 10s; pg_cron cobre o fallback)
async function queueText(input: {
  tenantId: string;
  conversationId: string | null;
  customerId?: string | null;
  customerName?: string | null;
  phone: string;
  content: string;
}): Promise<void> {
  const { data: row, error } = await supabase
    .from('scheduled_messages')
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      customer_id: input.customerId || null,
      customer_name: input.customerName || null,
      contact_phone: input.phone,
      content: input.content.trim(),
      scheduled_at: new Date(Date.now() + SEND_DELAY_MS).toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error || !row) {
    console.error('Failed to schedule auto message:', error?.message);
    return;
  }

  // Caminho primario: processa em 10s se o navegador ainda estiver aberto
  window.setTimeout(() => {
    void processScheduledRow(row.id);
  }, SEND_DELAY_MS);
}

// Claim atomico da fila: so processa quem chegar primeiro (navegador ou worker)
async function processScheduledRow(rowId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data: claimed } = await supabase
    .from('scheduled_messages')
    .update({ status: 'processing', claimed_at: now })
    .eq('id', rowId)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  if (!claimed) return;

  try {
    await deliverScheduled(claimed);
    await supabase.from('scheduled_messages').update({ status: 'sent' }).eq('id', rowId);
  } catch (err) {
    console.error('Failed to deliver scheduled message:', err);
    await supabase
      .from('scheduled_messages')
      .update({ status: 'failed', error: (err as Error).message })
      .eq('id', rowId);
  }
}

type ScheduledRow = {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  contact_phone: string;
  content: string;
};

async function deliverScheduled(row: ScheduledRow): Promise<void> {
  const convRepo = new ConversationRepository();
  let conv: Conversation | null = row.conversation_id
    ? await convRepo.getById(row.conversation_id)
    : null;
  if (!conv) {
    conv = await convRepo.getByContactPhone(row.contact_phone);
  }
  if (!conv) {
    conv = await convRepo.create({
      contact_phone: row.contact_phone,
      contact_name: row.customer_name || undefined,
      customer_id: row.customer_id || undefined,
      status: 'open',
      unread_count: 0,
      last_message_at: new Date().toISOString(),
    });
  }

  const { data: conn } = await supabase
    .from('connections')
    .select('id')
    .eq('tenant_id', conv.tenant_id || '')
    .eq('status', 'connected')
    .limit(1)
    .single();

  let waMessageId: string | undefined;
  let msgStatus = 'sent';

  if (conn) {
    const { sendTextMessage } = await import('@/lib/api-alternativa.service');
    const result = await sendTextMessage(conn.id, conv.contact_phone, row.content);
    if (result.success) {
      waMessageId = result.messageId;
      msgStatus = result.status || 'sent';
    } else {
      msgStatus = 'error';
      console.error('Failed to send scheduled message via API:', result.error);
    }
  }

  const msgRepo = new MessageRepository();
  await msgRepo.create({
    conversation_id: conv.id,
    contact_phone: conv.contact_phone,
    content: row.content,
    direction: 'outbound',
    read: true,
    status: msgStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'error',
    wa_message_id: waMessageId,
  });

  await convRepo.update(conv.id, {
    last_message: row.content.substring(0, 100),
    last_message_at: new Date().toISOString(),
  });
}
