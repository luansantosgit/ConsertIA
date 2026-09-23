import { supabase } from './supabase';

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

    const instanceName = connection.instance_name || `consertia-${Date.now()}`;
    const adminToken = settings.adminToken;

    if (!adminToken) {
      return { success: false, error: 'Token admin da API Alternativa nao configurado.' };
    }

    // Step 1: Create instance (or get existing)
    let instanceToken = connection.instance_token;

    if (!instanceToken) {
      const createResp = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': adminToken,
        },
        body: JSON.stringify({ name: instanceName }),
      });

      const createData = await createResp.json();

      if (!createResp.ok) {
        return { success: false, error: createData?.message || 'Falha ao criar instancia.' };
      }

      instanceToken = createData?.token || createData?.instanceToken || createData?.instance?.token;

      if (!instanceToken) {
        return { success: false, error: 'Token da instancia nao retornado.' };
      }

      await supabase
        .from('connections')
        .update({
          instance_name: instanceName,
          instance_token: instanceToken,
          instance_data: createData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);
    }

    // Step 2: Connect instance (generates QR code)
    const connectResp = await fetch(`${baseUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({}),
    });

    const connectData = await connectResp.json();

    if (!connectResp.ok) {
      return { success: false, error: connectData?.message || 'Falha ao gerar QR Code.' };
    }

    const qrCode = connectData?.qrcode || connectData?.qrCode || connectData?.qr || connectData?.base64
      || connectData?.instance?.qrcode || connectData?.instance?.qrCode || null;

    await supabase
      .from('connections')
      .update({
        status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      qrCode: qrCode || undefined,
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

    await fetch(`${baseUrl}/instance/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({}),
    });

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
      await fetch(`${baseUrl}/instance`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
      });
    }

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
