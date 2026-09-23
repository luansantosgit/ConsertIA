import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BASE_URL = "https://whatsapp-auth.pontaltech.com.br";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ConnectionRow = {
  id: string;
  tenant_id: string;
  provider: string;
  instance_data: Record<string, unknown> | null;
  bsp_username: string | null;
  bsp_password: string | null;
  bsp_phone_number_id: string | null;
};

type OutboundMediaType = "image" | "video" | "audio" | "document";

const authCache = new Map<string, { token: string; expiresAt: number }>();

class ApiOficialSendError extends Error {
  status: number;
  code?: number;
  details?: Record<string, unknown>;
  constructor(message: string, status: number, options?: { code?: number; details?: Record<string, unknown> }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00") && digits.length > 4) return digits.slice(2);
  if (digits.startsWith("55")) return digits;
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

function normalizeErrorMessage(payload: any, fallback: string) {
  const root = payload?.error || payload;
  if (!root) return fallback;
  if (typeof root === "string") return root;
  if (typeof root?.message === "string") return root.message;
  if (typeof root?.title === "string") return root.title;
  return fallback;
}

function extractMessageId(payload: any) {
  const fromMessages = Array.isArray(payload?.messages) ? String(payload.messages[0]?.id || "").trim() : "";
  if (fromMessages) return fromMessages;
  return String(payload?.messageId || payload?.id || "").trim() || null;
}

async function resolveConnection(payload: any): Promise<ConnectionRow> {
  const candidates = [payload?.connectionId, payload?.connection_id, payload?.connection?.id, payload?.apikey, payload?.apiKey]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const { data: byId } = await db
      .from("connections")
      .select("id, tenant_id, provider, instance_data, bsp_username, bsp_password, bsp_phone_number_id")
      .eq("id", candidate)
      .maybeSingle();
    if (byId) return byId as ConnectionRow;

    const { data: byToken } = await db
      .from("connections")
      .select("id, tenant_id, provider, instance_data, bsp_username, bsp_password, bsp_phone_number_id")
      .eq("instance_token", candidate)
      .maybeSingle();
    if (byToken) return byToken as ConnectionRow;
  }

  throw new ApiOficialSendError("Conexao nao encontrada para envio oficial.", 404);
}

async function authenticateBsp(connection: ConnectionRow, forceRefresh = false) {
  const username = String(connection.bsp_username || "").trim();
  const password = String(connection.bsp_password || "").trim();
  if (!username || !password) {
    throw new ApiOficialSendError("Credenciais API Oficial ausentes na conexao.", 400);
  }

  const cacheKey = `${connection.id}:${username}`;
  if (!forceRefresh) {
    const cached = authCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.token;
  }

  const response = await fetch(`${BASE_URL}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

  if (!response.ok) {
    throw new ApiOficialSendError(
      normalizeErrorMessage(payload, `Falha na autenticacao da API Oficial (${response.status}).`),
      response.status >= 400 && response.status < 500 ? response.status : 502,
    );
  }

  const token = String(payload?.token || "").trim();
  if (!token) {
    throw new ApiOficialSendError("A autenticacao da API Oficial nao retornou token valido.", 502);
  }

  authCache.set(cacheKey, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return token;
}

async function pontalSendMessage(connection: ConnectionRow, body: Record<string, unknown>) {
  const phoneNumberId = String(connection.bsp_phone_number_id || "").trim();
  if (!phoneNumberId) {
    throw new ApiOficialSendError("Phone Number ID nao configurado na conexao oficial.", 400);
  }

  const endpoint = `${BASE_URL}/v22.0/${encodeURIComponent(phoneNumberId)}/messages`;

  const performRequest = async (token: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
    return { ok: response.ok, status: response.status, payload };
  };

  let token = await authenticateBsp(connection);
  let result = await performRequest(token);

  if (result.status === 401) {
    token = await authenticateBsp(connection, true);
    result = await performRequest(token);
  }

  if (!result.ok) {
    throw new ApiOficialSendError(
      normalizeErrorMessage(result.payload, `Falha API Oficial (${result.status}).`),
      result.status >= 400 && result.status < 500 ? result.status : 502,
    );
  }

  return result.payload;
}

function buildTextPayload(params: { number: string; text: string; replyid?: string }) {
  const text = String(params.text || "").trim();
  if (!text) throw new ApiOficialSendError("Texto obrigatorio para envio oficial.", 400);

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.number,
    type: "text",
    text: { preview_url: false, body: text },
  };

  const replyid = String(params.replyid || "").trim();
  if (replyid) payload.context = { message_id: replyid };
  return payload;
}

function buildMediaPayload(params: {
  number: string;
  type: OutboundMediaType;
  file?: string;
  mediaId?: string;
  docName?: string;
  text?: string;
  replyid?: string;
}) {
  const type = String(params.type || "").trim() as OutboundMediaType;
  const file = String(params.file || "").trim();
  const mediaId = String(params.mediaId || "").trim();

  if (!type || !["image", "video", "audio", "document"].includes(type)) {
    throw new ApiOficialSendError("Tipo de midia invalido para envio oficial.", 400);
  }
  if (!file && !mediaId) {
    throw new ApiOficialSendError("Midia obrigatoria para envio oficial.", 400);
  }

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.number,
    type,
  };

  const mediaBody: Record<string, unknown> = mediaId ? { id: mediaId } : { link: file };
  const caption = String(params.text || "").trim();

  if (type === "image" || type === "video" || type === "audio") {
    if (caption) mediaBody.caption = caption;
  } else if (type === "document") {
    if (caption) mediaBody.caption = caption;
    const docName = String(params.docName || "").trim();
    if (docName) mediaBody.filename = docName;
  }

  payload[type] = mediaBody;

  const replyid = String(params.replyid || "").trim();
  if (replyid) payload.context = { message_id: replyid };
  return payload;
}

function buildTemplatePayload(params: {
  number: string;
  templateName: string;
  languageCode?: string;
  components?: unknown;
  replyid?: string;
}) {
  const templateName = String(params.templateName || "").trim();
  if (!templateName) throw new ApiOficialSendError("templateName obrigatorio para envio de template.", 400);

  const languageCode = String(params.languageCode || "pt_BR").trim() || "pt_BR";
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.number,
    type: "template",
    template: { name: templateName, language: { code: languageCode } },
  };

  if (Array.isArray(params.components) && params.components.length > 0) {
    (payload.template as Record<string, unknown>).components = params.components;
  }

  const replyid = String(params.replyid || "").trim();
  if (replyid) payload.context = { message_id: replyid };
  return payload;
}

async function fetchConversationForWindow(params: { tenant_id: string; conversationId?: string; number: string }) {
  const conversationId = String(params.conversationId || "").trim();
  if (conversationId) {
    const { data } = await db
      .from("conversations")
      .select("id, last_message_time")
      .eq("tenant_id", params.tenant_id)
      .eq("id", conversationId)
      .maybeSingle();
    if (data) return data;
  }

  const normalized = normalizePhone(params.number);
  if (!normalized) return null;

  const { data } = await db
    .from("conversations")
    .select("id, last_message_time")
    .eq("tenant_id", params.tenant_id)
    .eq("contact_phone", normalized)
    .order("last_message_time", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function assertCustomerWindow24h(params: { tenant_id: string; number: string; conversationId?: string }) {
  const conversation = await fetchConversationForWindow(params);
  const lastMessageTime = String((conversation as any)?.last_message_time || "").trim();

  if (!lastMessageTime) {
    throw new ApiOficialSendError(
      "Janela de 24h expirada. Envie template oficial para reabrir a conversa.",
      403,
      { code: 131047, details: { conversationId: (conversation as any)?.id || null } },
    );
  }

  const lastTs = new Date(lastMessageTime).getTime();
  if (!Number.isFinite(lastTs) || Date.now() - lastTs > WINDOW_24H_MS) {
    throw new ApiOficialSendError(
      "Janela de 24h expirada. Envie template oficial para reabrir a conversa.",
      403,
      { code: 131047, details: { conversationId: (conversation as any)?.id || null, lastMessageTime } },
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  try {
    const payload = await req.json();
    const action = String(payload?.action || "").trim();

    if (!["send_text", "send_media", "send_template"].includes(action)) {
      throw new ApiOficialSendError("Acao invalida para envio oficial.", 400);
    }

    const connection = await resolveConnection(payload);
    if (String(connection.provider || "") !== "api_oficial") {
      throw new ApiOficialSendError("A conexao informada nao e um canal API Oficial.", 400);
    }

    const number = normalizePhone(String(payload?.number || ""));
    if (!number) throw new ApiOficialSendError("Numero invalido para envio oficial.", 400);

    const conversationId = String(payload?.conversationId || "").trim() || undefined;

    if (action !== "send_template") {
      await assertCustomerWindow24h({
        tenant_id: String(connection.tenant_id),
        number,
        conversationId,
      });
    }

    if (action === "send_text") {
      const responsePayload = await pontalSendMessage(
        connection,
        buildTextPayload({ number, text: String(payload?.text || ""), replyid: String(payload?.replyid || "") }),
      );
      const messageId = extractMessageId(responsePayload);
      return json({ success: true, id: messageId, messageid: messageId, data: responsePayload });
    }

    if (action === "send_media") {
      const outboundType = String(payload?.type || "") as OutboundMediaType;
      const responsePayload = await pontalSendMessage(
        connection,
        buildMediaPayload({
          number,
          type: outboundType,
          file: String(payload?.file || ""),
          mediaId: String(payload?.mediaId || "").trim() || undefined,
          docName: String(payload?.docName || ""),
          text: String(payload?.text || ""),
          replyid: String(payload?.replyid || ""),
        }),
      );
      const messageId = extractMessageId(responsePayload);
      return json({ success: true, id: messageId, messageid: messageId, data: responsePayload });
    }

    if (action === "send_template") {
      const responsePayload = await pontalSendMessage(
        connection,
        buildTemplatePayload({
          number,
          templateName: String(payload?.templateName || payload?.template_name || ""),
          languageCode: String(payload?.languageCode || payload?.language_code || "pt_BR"),
          components: payload?.components,
          replyid: String(payload?.replyid || ""),
        }),
      );
      const messageId = extractMessageId(responsePayload);
      return json({ success: true, id: messageId, messageid: messageId, data: responsePayload });
    }

    return json({ error: "Acao nao implementada." }, 400);
  } catch (error) {
    if (error instanceof ApiOficialSendError) {
      return json({ error: error.message, code: error.code, ...(error.details || {}) }, error.status);
    }
    return json({ error: (error as Error).message || "Falha inesperada no envio via API Oficial." }, 500);
  }
});
