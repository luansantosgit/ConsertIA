import { supabase } from './supabase';
import { useThemeStore } from '@/stores/theme.store';

interface GenerateQRResult {
  success: boolean;
  qrCode?: string;
  instanceName?: string;
  error?: string;
}

interface ConnectionStatusResult {
  connected: boolean;
  status: string;
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
}

async function getPlatformConfig(): Promise<{ adminToken: string; uazapiSubdomain: string; webhookUrl: string }> {
  const { data } = await supabase
    .from('platform_settings')
    .select('admin_api_token, uazapi_subdomain, webhook_url')
    .limit(1)
    .maybeSingle();

  return {
    adminToken: (data as any)?.admin_api_token || '',
    uazapiSubdomain: (data as any)?.uazapi_subdomain || 'api',
    webhookUrl: (data as any)?.webhook_url || '',
  };
}

export async function configureWebhook(connectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;
    const webhookUrl = settings.webhookUrl;

    if (!webhookUrl) return { success: false, error: 'Webhook URL nao configurada.' };

    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['messages', 'messages_update', 'connection'],
        excludeMessages: ['wasSentByApi'],
        enabled: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err?.error || 'Falha ao configurar webhook.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function generateQRCode(connectionId: string): Promise<GenerateQRResult> {
  try {
    const settings = await getPlatformConfig();
    const subdomain = settings.uazapiSubdomain || 'api';
    const baseUrl = `https://${subdomain}.uazapi.com`;

    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexao nao encontrada.' };
    }

    const instanceName = connection.instance_name || `deeperia-${Date.now()}`;
    const adminToken = settings.adminToken;

    if (!adminToken) {
      return { success: false, error: 'Token admin da API Alternativa nao configurado.' };
    }

    const extractQr = (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      const inst = d?.instance as Record<string, unknown> | undefined;
      return (d?.qrcode || d?.qrCode || d?.qr || d?.base64 || inst?.qrcode || inst?.qrCode) as string | null | undefined ?? null;
    };
    const connectInstance = async (token: string) => {
      // systemName: nome exibido no celular em "aparelhos conectados" —
      // sem isso o WhatsApp mostra o navegador + nome do provedor (uazapiGO).
      // Usa o NOME DO SISTEMA registrado pelo superadmin (tema global).
      const brand = useThemeStore.getState().globalTheme?.logoText || 'DeeperIA';
      const res = await fetch(`${baseUrl}/instance/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token },
        body: JSON.stringify({ browser: 'auto', systemName: brand }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    let instanceToken = connection.instance_token;
    let instanceData = connection.instance_data;
    let qrCode: string | null = null;

    // Step 1: tenta o QR na instancia existente
    if (instanceToken) {
      const res = await connectInstance(instanceToken);
      if (res.ok) {
        qrCode = extractQr(res.data);
        if (!qrCode) {
          return { success: false, error: 'Falha ao gerar QR Code. Tente novamente em instantes.' };
        }
      } else if (res.status !== 401) {
        // Ex.: ja conectada — nao recria a instancia por engano
        return { success: false, error: (res.data as { message?: string })?.message || 'Falha ao gerar QR Code.' };
      }
      // 401 → token nao pertence a este subdominio (instancia legada):
      // cai no Step 2 e recria com o token admin atual
    }

    // Step 2: sem token ou token invalido → cria nova instancia
    if (!qrCode) {
      const createResp = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': adminToken,
        },
        body: JSON.stringify({ name: instanceName }),
      });

      const createData = await createResp.json().catch(() => ({}));

      if (!createResp.ok) {
        return { success: false, error: createData?.message || 'Falha ao criar instancia.' };
      }

      instanceToken = createData?.token || createData?.instanceToken || createData?.instance?.token;

      if (!instanceToken) {
        return { success: false, error: 'Token da instancia nao retornado.' };
      }
      instanceData = createData;

      const res = await connectInstance(instanceToken);
      qrCode = extractQr(res.data);
      if (!res.ok || !qrCode) {
        return { success: false, error: 'Falha ao gerar QR Code. Tente novamente em instantes.' };
      }
    }

    await supabase
      .from('connections')
      .update({
        instance_name: instanceName,
        instance_token: instanceToken,
        instance_data: instanceData,
        status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    await supabase
      .from('connections')
      .update({
        status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      qrCode: (qrCode as string) || undefined,
      instanceName,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function checkConnectionStatus(connectionId: string): Promise<ConnectionStatusResult> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { connected: false, status: 'not_found' };
    }

    const settings = await getPlatformConfig();
    const subdomain = settings.uazapiSubdomain || 'api';
    const baseUrl = `https://${subdomain}.uazapi.com`;
    const token = connection.instance_token;

    if (!token) {
      return { connected: false, status: 'no_token' };
    }

    const response = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'token': token,
      },
    });

    const data = await response.json();
    const connected = data?.status?.connected === true;

    const newStatus = connected ? 'connected' : 'disconnected';

    await supabase
      .from('connections')
      .update({
        status: newStatus,
        profile_name: data?.instance?.profileName || data?.instance?.name,
        profile_pic_url: data?.instance?.profilePicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      connected,
      status: newStatus,
      profileName: data?.instance?.profileName,
      profilePicUrl: data?.instance?.profilePicUrl,
      number: data?.status?.jid?.user,
    };
  } catch (error) {
    return { connected: false, status: 'error' };
  }
}

export async function disconnectInstance(connectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexao nao encontrada.' };
    }

    const settings = await getPlatformConfig();
    const subdomain = settings.uazapiSubdomain || 'api';
    const baseUrl = `https://${subdomain}.uazapi.com`;
    const token = connection.instance_token;

    if (!token) {
      return { success: false, error: 'Token nao disponivel.' };
    }

    // Endpoint correto: POST /instance/disconnect (logout nao existe → 405).
    // 401 = instancia morta (numero conectado em outro QR): já está desconectada.
    const res = await fetch(`${baseUrl}/instance/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({}),
    });
    if (res.status !== 401) {
      void await res.text();
    }

    await supabase
      .from('connections')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteInstance(connectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexao nao encontrada.' };
    }

    const settings = await getPlatformConfig();
    const subdomain = settings.uazapiSubdomain || 'api';
    const baseUrl = `https://${subdomain}.uazapi.com`;
    const token = connection.instance_token;

    if (token) {
      // Melhor esforço no subdominio atual: instancias legadas de outro
      // dominio nao sao acessiveis do browser (CORS) — a exclusao do
      // registro e o que importa
      try {
        await fetch(`${baseUrl}/instance`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'token': token,
          },
        });
      } catch { /* ignora */ }
    }

    // Conversas pertencem ao contato (historico), nao a conexao:
    // desvincula antes de excluir para nao violar a FK
    await supabase
      .from('conversations')
      .update({ connection_id: null })
      .eq('connection_id', connectionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendTextMessage(
  connectionId: string,
  number: string,
  text: string,
  replyId?: string
): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexao nao encontrada.' };
    }

    const settings = await getPlatformConfig();
    const subdomain = settings.uazapiSubdomain || 'api';
    const baseUrl = `https://${subdomain}.uazapi.com`;
    const token = connection.instance_token;

    if (!token) {
      return { success: false, error: 'Token nao disponivel.' };
    }

    const body: Record<string, any> = { number, text };
    if (replyId) body.replyid = replyId;

    const response = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.message || data?.error || 'Falha ao enviar mensagem.' };
    }

    const messageId = data?.messageid || data?.key?.id || data?.id || null;
    const status = data?.status || 'Sent';

    return { success: true, messageId, status };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function reactToMessage(
  connectionId: string,
  number: string,
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ number, text: emoji, id: messageId }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err?.error || 'Falha ao enviar reacao.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function editMessage(
  connectionId: string,
  messageId: string,
  newText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ id: messageId, text: newText }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err?.error || 'Falha ao editar mensagem.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMessageApi(
  connectionId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ id: messageId }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err?.error || 'Falha ao apagar mensagem.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function markAsRead(
  connectionId: string,
  messageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/markread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ id: messageIds }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err?.error || 'Falha ao marcar como lida.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function fetchChatAvatar(
  connectionId: string,
  phone: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/chat/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ wa_chatid: `${phone}@s.whatsapp.net`, limit: 1 }),
    });

    if (!response.ok) {
      return { success: false, error: 'Falha ao buscar dados do chat.' };
    }

    const data = await response.json();
    const chat = data?.chats?.[0];
    const avatarUrl = chat?.imagePreview || chat?.image || null;
    if (!avatarUrl) return { success: false, error: 'Avatar nao disponivel.' };

    return { success: true, avatarUrl };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Solicita ao WhatsApp o sync sob demanda do histórico de um chat.
 * As mensagens chegam depois via webhook (evento `history`) e ficam
 * disponíveis em /message/find.
 *
 * @param connectionId ID da conexão no sistema
 * @param phone Número do chat (formato JID: 5511999999999@s.whatsapp.net)
 * @param count Quantidade desejada de mensagens (1-100, default 50)
 */
export async function requestHistorySync(
  connectionId: string,
  phone: string,
  count = 50,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('instance_token')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) {
      return { success: false, error: 'Token nao disponivel.' };
    }

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/history-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: connection.instance_token },
      body: JSON.stringify({
        number: phone.includes('@') ? phone : `${phone}@s.whatsapp.net`,
        mode: 'history',
        count: Math.min(Math.max(count, 1), 100),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data?.message || 'Falha ao solicitar historico.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Sincroniza o histórico de todos os chats recentes de uma instância.
 *
 * Fluxo:
 * 1. POST /chat/find — lista chats mais recentes (limitado a maxChats)
 * 2. Para cada chat, POST /message/history-sync — solicita até 50 mensagens
 * 3. Mensagens chegam via webhook (evento `history`) e entram no CRM
 *
 * @param connectionId ID da conexão no sistema
 * @param maxChats Máximo de chats para sincronizar (default 30)
 * @param onProgress Callback de progresso (current, total)
 */
export async function syncInstanceHistory(
  connectionId: string,
  maxChats = 30,
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('instance_token')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) {
      return { success: false, synced: 0, error: 'Token nao disponivel.' };
    }

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;
    const token = connection.instance_token;

    // 1. Buscar chats mais recentes (exclui grupos)
    const chatResponse = await fetch(`${baseUrl}/chat/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({
        limit: maxChats,
        offset: 0,
        sort: '-wa_lastMsgTimestamp',
        wa_isGroup: false,
      }),
    });

    const chatData = await chatResponse.json();
    if (!chatResponse.ok) {
      return { success: false, synced: 0, error: chatData?.message || 'Falha ao listar chats.' };
    }

    const chats: Array<{ wa_chatid?: string }> = chatData?.chats ?? [];
    const jids = chats
      .map(c => c.wa_chatid)
      .filter((jid): jid is string => typeof jid === 'string' && jid.includes('@s.whatsapp.net'));

    if (jids.length === 0) {
      return { success: true, synced: 0 };
    }

    // 2. Solicitar history-sync para cada chat
    let synced = 0;
    for (let i = 0; i < jids.length; i++) {
      onProgress?.(i + 1, jids.length);
      try {
        await fetch(`${baseUrl}/message/history-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token },
          body: JSON.stringify({ number: jids[i], mode: 'history', count: 50 }),
        });
        synced++;
      } catch {
        // Continua para o próximo chat mesmo se um falhar
      }
    }

    return { success: true, synced };
  } catch (error) {
    return { success: false, synced: 0, error: (error as Error).message };
  }
}

export type SendMediaType =
  | 'image' | 'video' | 'videoplay' | 'document'
  | 'audio' | 'myaudio' | 'ptt' | 'ptv' | 'sticker';

interface SendMediaOptions {
  caption?: string;
  docName?: string;
  mimetype?: string;
  replyId?: string;
  asyncSend?: boolean;
}

export async function sendMediaMessage(
  connectionId: string,
  number: string,
  type: SendMediaType,
  file: string,
  options?: SendMediaOptions
): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const body: Record<string, string | boolean> = { number, type, file };
    if (options?.caption) body.text = options.caption;
    if (options?.docName) body.docName = options.docName;
    if (options?.mimetype) body.mimetype = options.mimetype;
    if (options?.replyId) body.replyid = options.replyId;
    if (options?.asyncSend) body.async = true;

    const response = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data?.message || data?.error || 'Falha ao enviar midia.' };
    }

    return {
      success: true,
      messageId: data?.messageid || data?.key?.id || data?.id || undefined,
      status: data?.status || 'Sent',
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function downloadMessageMedia(
  connectionId: string,
  messageId: string
): Promise<{ success: boolean; fileUrl?: string; mimetype?: string; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection?.instance_token) return { success: false, error: 'Token nao disponivel.' };

    const settings = await getPlatformConfig();
    const baseUrl = `https://${settings.uazapiSubdomain || 'api'}.uazapi.com`;

    const response = await fetch(`${baseUrl}/message/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': connection.instance_token },
      body: JSON.stringify({ id: messageId, return_link: true }),
    });

    if (!response.ok) {
      return { success: false, error: 'Falha ao baixar midia.' };
    }

    const data = await response.json();
    if (!data?.fileURL && !data?.base64Data) {
      return { success: false, error: 'Midia nao disponivel.' };
    }

    return {
      success: true,
      fileUrl: data?.fileURL || undefined,
      mimetype: data?.mimetype || undefined,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
