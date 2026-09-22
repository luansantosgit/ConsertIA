import type { Conversation, Message, ServiceOrderStatus } from '@/types';

export type ChatMediaType = 'image' | 'video' | 'audio' | 'ptt' | 'document' | 'sticker';

export interface ChatMessage {
  id: string;
  from: 'customer' | 'bot' | 'attendant';
  text: string;
  time: string;
  /** ISO 8601 timestamp para ordenação cronológica definitiva após confirmação do banco */
  createdAt?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  waMessageId?: string;
  reaction?: string;
  edited?: boolean;
  deleted?: boolean;
  replyTo?: string;
  mediaType?: ChatMediaType;
  mediaUrl?: string;
  osCard?: {
    osId: string;
    equipment: string;
    subject: string;
    budget?: number;
    status: ServiceOrderStatus;
  };
}

export type ForwardTarget =
  | { type: 'conversation'; id: string }
  | { type: 'customer'; id: string };

export interface ConvRow extends Conversation {
  contactName: string;
  contactAvatar?: string;
  lastMessage: string;
  deviceInfo: string;
  notes?: string;
  aiSuggestion?: string;
}

export function toChatMessage(msg: Message): ChatMessage {
  const d = new Date(msg.created_at);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  let mediaType = (msg.media_type as ChatMediaType) || undefined;
  let text = msg.content || '';
  let mediaUrl = msg.media_url || undefined;

  // Fallback: se o conteúdo for um JSON bruto de mídia recebido do WhatsApp
  if (typeof text === 'string' && (text.startsWith('{"URL":"') || text.includes('"mimetype":') || text.includes('"URL":'))) {
    try {
      const parsed = JSON.parse(text);
      const mime = (parsed.mimetype || '').toLowerCase();
      if (!mediaType) {
        if (mime.startsWith('image/')) mediaType = 'image';
        else if (mime.startsWith('video/')) mediaType = 'video';
        else if (mime.startsWith('audio/')) mediaType = 'audio';
        else mediaType = 'document';
      }
      text = parsed.caption || (mediaType ? mediaLabel(mediaType) : '');
      if (!mediaUrl && (parsed.URL || parsed.url || parsed.fileUrl || parsed.mediaUrl)) {
        mediaUrl = parsed.URL || parsed.url || parsed.fileUrl || parsed.mediaUrl;
      }
    } catch {
      // ignore
    }
  }

  return {
    id: msg.id,
    from: msg.direction === 'inbound'
      ? 'customer'
      : msg.sender_type === 'ai' ? 'bot' : 'attendant',
    text,
    time,
    createdAt: msg.created_at,
    status: msg.status as ChatMessage['status'],
    waMessageId: msg.wa_message_id,
    reaction: msg.reaction,
    edited: msg.edited,
    deleted: msg.deleted,
    replyTo: msg.reply_to,
    mediaType,
    mediaUrl,
  };
}

export function mediaLabel(type: ChatMediaType): string {
  switch (type) {
    case 'image': return '📷 Imagem';
    case 'video': return '🎥 Vídeo';
    case 'audio': return '🎤 Áudio';
    case 'ptt': return '🎤 Mensagem de voz';
    case 'sticker': return '🎭 Figurinha';
    case 'document': return '📄 Documento';
  }
}

export function timeAgo(iso: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const STATUS_BADGE: Record<ServiceOrderStatus, { label: string; badge: string }> = {
  pending: { label: 'Pendente', badge: 'badge-gray' },
  diagnosis: { label: 'Diagnóstico', badge: 'badge-info' },
  awaiting_approval: { label: 'Ag. Aprovação', badge: 'badge-warning' },
  approved: { label: 'Aprovado', badge: 'badge-primary' },
  awaiting_part: { label: 'Ag. Peça', badge: 'badge-danger' },
  in_progress: { label: 'Em Andamento', badge: 'badge-info' },
  completed: { label: 'Concluído', badge: 'badge-success' },
  ready: { label: 'Pronto', badge: 'badge-success' },
  cancelled: { label: 'Cancelado', badge: 'badge-gray' },
};