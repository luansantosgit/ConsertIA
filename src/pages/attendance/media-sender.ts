import { supabase } from '@/lib/supabase';
import { sendMediaMessage } from '@/lib/api-alternativa.service';

/**
 * Limites do WhatsApp por tipo de mídia.
 *
 * A documentação da Uazapi (docs/integrations/uazapi-openapi-spec.yaml)
 * não define um número próprio: ela aceita URL ou base64 e devolve 413
 * "Arquivo muito grande" quando o WhatsApp recusa. O limite efetivo é o
 * do WhatsApp — 16 MB para imagem/vídeo/áudio e 100 MB para documento.
 */
export const WHATSAPP_LIMITS = {
  image: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
} as const;

/**
 * Limite efetivo do Supabase Storage no plano atual (o limite global é
 * 50 MB, mesmo com o bucket configurado para 100 MB). Arquivos maiores
 * seguem direto em base64 para a Uazapi.
 */
export const STORAGE_LIMIT = 50 * 1024 * 1024;

export type OutboundMediaType = 'image' | 'video' | 'ptt' | 'document';

export function baseMediaType(mime: string): OutboundMediaType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'ptt';
  return 'document';
}

/**
 * Mídia acima do limite do WhatsApp é reenviada como documento.
 * Ex.: um vídeo de 20 s com 30 MB vira um arquivo .mp4 (limite 100 MB),
 * em vez de falhar no envio como vídeo (limite 16 MB).
 */
export function resolveMediaType(
  mime: string,
  size: number,
): { type: OutboundMediaType; converted: boolean } {
  // MediaRecorder devolve o MIME com codecs (ex.: video/mp4;codecs=avc1...),
  // então normaliza antes de comparar com video/mp4.
  const baseMime = mime.split(';')[0].trim().toLowerCase();
  const base = baseMediaType(baseMime);
  if (base === 'document') return { type: 'document', converted: false };
  // A Uazapi só aceita MP4 como vídeo; .mov (iPhone), WebM etc. vão
  // como documento para não falhar no envio.
  if (base === 'video' && baseMime !== 'video/mp4') {
    return { type: 'document', converted: true };
  }
  const limit = WHATSAPP_LIMITS[base === 'ptt' ? 'audio' : base];
  return size > limit
    ? { type: 'document', converted: true }
    : { type: base, converted: false };
}

function friendlyError(error?: string): string | undefined {
  if (!error) return undefined;
  if (/size|large|exceed|413/i.test(error)) {
    return 'Arquivo muito grande para o WhatsApp.';
  }
  return error;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Sobe a mídia para o bucket público (a Uazapi baixa pela URL). */
export async function uploadChatMedia(file: File, convId: string): Promise<string | null> {
  if (file.size > STORAGE_LIMIT) return null;
  try {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const safeExt = ext.replace(/[^\w.]/g, '');
    const path = `${convId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, file, { contentType: file.type || undefined });
    if (error) {
      console.error('Storage upload error:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('Failed to upload media:', err);
    return null;
  }
}

export interface SendMediaFileParams {
  connectionId: string;
  contactPhone: string;
  convId: string;
  file: File;
  caption?: string;
  replyWaId?: string;
}

export interface SendMediaFileResult {
  success: boolean;
  status: string;
  sendType: OutboundMediaType;
  converted: boolean;
  waMessageId?: string;
  mediaUrl?: string;
  error?: string;
}

/**
 * Envia um arquivo: decide o tipo (com fallback para documento), sobe
 * para o Storage quando cabe e recorre ao base64 quando não cabe.
 */
export async function sendMediaFile(params: SendMediaFileParams): Promise<SendMediaFileResult> {
  const { connectionId, contactPhone, convId, file, caption, replyWaId } = params;
  const mime = file.type || '';
  const { type: sendType, converted } = resolveMediaType(mime, file.size);

  if (file.size > WHATSAPP_LIMITS.document) {
    return {
      success: false,
      status: 'error',
      sendType,
      converted,
      error: `Arquivo muito grande (${formatFileSize(file.size)}). O limite do WhatsApp é 100 MB.`,
    };
  }

  try {
    const publicUrl = await uploadChatMedia(file, convId);
    // Acima do limite do Storage, envia o base64 direto para a Uazapi.
    const fileRef = publicUrl || (await fileToBase64(file)).split(',')[1];

    const result = await sendMediaMessage(connectionId, contactPhone, sendType, fileRef, {
      caption: caption || undefined,
      docName: sendType === 'document' ? (file.name || 'arquivo') : undefined,
      mimetype: mime || undefined,
      replyId: replyWaId,
      // Imagens são rápidas e podem ir em async; vídeos/documentos
      // bloqueiam a fila até a Uazapi confirmar a entrega.
      asyncSend: sendType === 'image',
    });

    return {
      success: result.success,
      status: result.success ? (result.status || 'sent') : 'error',
      sendType,
      converted,
      waMessageId: result.messageId,
      // Sem Storage (arquivo > 50 MB), guarda a URL devolvida pela Uazapi
      // para a mídia continuar visível depois de recarregar o chat.
      mediaUrl: publicUrl || result.fileUrl,
      error: friendlyError(result.error),
    };
  } catch (err) {
    console.error('Failed to send media:', err);
    return {
      success: false,
      status: 'error',
      sendType,
      converted,
      error: err instanceof Error ? err.message : 'Falha ao enviar a mídia.',
    };
  }
}
