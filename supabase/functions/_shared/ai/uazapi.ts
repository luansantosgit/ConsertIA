import type { AgentContext } from "./types.ts";

export function typingDelayMs(text: string): number {
  const base = text.length * 35;
  return Math.min(Math.max(base, 1200), 7000);
}

export async function sendTyping(ctx: AgentContext, delayMs: number): Promise<void> {
  if (!ctx.agent.typing_simulation || !ctx.connectionToken) return;
  try {
    await fetch(`${ctx.uazapiBase}/message/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: ctx.connectionToken },
      body: JSON.stringify({
        number: ctx.conversation.contact_phone,
        presence: "composing",
        delay: Math.min(delayMs, 300000),
      }),
    });
  } catch (err) {
    console.warn("[ai-agent] presence failed:", (err as Error).message);
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function mediaTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (/\.(mp4)$/.test(lower)) return "video";
  if (/\.(mp3|ogg|wav|m4a)$/.test(lower)) return "audio";
  if (/\.(pdf|docx?|xlsx?|txt)$/.test(lower)) return "document";
  return "image";
}

async function persistMessage(ctx: AgentContext, content: string, waMessageId: string | null, status: string): Promise<void> {
  await ctx.supabase.from("messages").insert({
    conversation_id: ctx.conversation.id,
    tenant_id: ctx.tenantId,
    contact_phone: ctx.conversation.contact_phone,
    content,
    direction: "outbound",
    sender_type: "ai",
    read: true,
    status,
    wa_message_id: waMessageId ?? undefined,
    message_type: "text",
  });
  await ctx.supabase
    .from("conversations")
    .update({
      last_message: content.substring(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq("id", ctx.conversation.id);
}

export async function sendText(ctx: AgentContext, text: string): Promise<void> {
  if (!ctx.connectionToken) throw new Error("Sem connection token para envio");

  const delay = typingDelayMs(text);
  await sendTyping(ctx, delay);
  await wait(delay);

  const resp = await fetch(`${ctx.uazapiBase}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: ctx.connectionToken },
    body: JSON.stringify({ number: ctx.conversation.contact_phone, text }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    await persistMessage(ctx, text, null, "error");
    throw new Error(`Uazapi send failed: ${data?.error ?? resp.status}`);
  }
  const waId = data?.messageid || data?.key?.id || data?.id || null;
  await persistMessage(ctx, text, waId, (data?.status || "sent").toString().toLowerCase());
}

export async function sendMedia(ctx: AgentContext, mediaUrl: string, caption: string): Promise<void> {
  if (!ctx.connectionToken) throw new Error("Sem connection token para envio");

  await sendTyping(ctx, 1500);
  await wait(1200);

  const resp = await fetch(`${ctx.uazapiBase}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: ctx.connectionToken },
    body: JSON.stringify({
      number: ctx.conversation.contact_phone,
      type: mediaTypeFromUrl(mediaUrl),
      file: mediaUrl,
      text: caption || undefined,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    await persistMessage(ctx, caption || mediaUrl, null, "error");
    throw new Error(`Uazapi media failed: ${data?.error ?? resp.status}`);
  }
  const waId = data?.messageid || data?.key?.id || data?.id || null;
  await persistMessage(ctx, caption || mediaUrl, waId, (data?.status || "sent").toString().toLowerCase());
}
