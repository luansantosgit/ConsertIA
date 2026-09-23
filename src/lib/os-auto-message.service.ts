import { supabase } from '@/lib/supabase';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { TenantSettingsRepository } from '@/repositories/tenant-settings.repository';
import { useAuthStore } from '@/stores/auth.store';
import type { ServiceOrderStatus, Conversation } from '@/types';

export interface StageAutoMessage {
  enabled: boolean;
  message: string;
}

export type KanbanAutoMessages = Partial<Record<ServiceOrderStatus, StageAutoMessage>>;

const SETTINGS_KEY = 'kanban_auto_messages';
const SEND_DELAY_MS = 10_000;

export async function loadKanbanAutoMessages(): Promise<KanbanAutoMessages> {
  try {
    const raw = await new TenantSettingsRepository().getValue(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as KanbanAutoMessages;
  } catch (err) {
    console.error('Failed to load kanban auto messages:', err);
    return {};
  }
}

export async function saveKanbanAutoMessages(config: KanbanAutoMessages): Promise<void> {
  await new TenantSettingsRepository().setValue(SETTINGS_KEY, JSON.stringify(config));
}

export interface AutoMessageTarget {
  conversationId?: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
}

// Agenda via DB: o disparo nao depende mais do navegador ficar aberto.
// O navegador processa em 10s (primario); o pg_cron + Edge Function cobre o fallback.
export async function scheduleStageAutoMessage(target: AutoMessageTarget, config?: StageAutoMessage): Promise<void> {
  if (!config?.enabled || !config.message.trim()) return;
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
    const scheduledAt = new Date(Date.now() + SEND_DELAY_MS).toISOString();
    const { data: row, error } = await supabase
      .from('scheduled_messages')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        customer_id: target.customerId || null,
        customer_name: target.customerName || null,
        contact_phone: phone,
        content: config.message.trim(),
        scheduled_at: scheduledAt,
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
  } catch (err) {
    console.error('Failed to schedule stage auto message:', err);
  }
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
