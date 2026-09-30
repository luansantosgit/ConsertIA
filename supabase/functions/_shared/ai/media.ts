// Transcrição/entendimento de mídias (áudio, imagem, vídeo, documento) via modelo
// multimodal do OpenRouter configurado pelo superadmin. O consumo entra na cota
// do plano da empresa (trackUsage + ai_logs), usando a MESMA apiKey do agente.
import type { AgentContext } from "./types.ts";
import { trackUsage } from "./settings.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TRANSCRIPTION_MODEL = "google/gemini-3.1-flash-lite";
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

const MEDIA_PROMPTS: Record<string, string> = {
  audio: "Transcreva este áudio enviado por um cliente na íntegra, em português do Brasil. Responda APENAS com a transcrição do que foi dito, sem preâmbulos.",
  image: "Um cliente de assistência técnica enviou esta foto do aparelho. Responda APENAS com a descrição objetiva, sem preâmbulos: aparelho (marca/modelo se legível), estado da tela e danos visíveis. Se houver texto na imagem, transcreva.",
  video: "Um cliente de assistência técnica enviou este vídeo. Responda APENAS com a descrição objetiva, sem preâmbulos: o que aparece, aparelhos e danos visíveis.",
  doc: "Um cliente enviou este documento. Responda APENAS com o conteúdo relevante extraído, sem preâmbulos: texto principal, dados do aparelho e problemas citados.",
};

function mediaKind(mediaType: string | null | undefined): keyof typeof MEDIA_PROMPTS {
  const t = (mediaType ?? "").toLowerCase();
  if (t === "image" || t === "sticker") return "image";
  if (t === "audio" || t === "ptt") return "audio";
  if (t === "video" || t === "ptv") return "video";
  return "doc";
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface TranscriptionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function transcribeMedia(
  ctx: AgentContext,
  mediaUrl: string,
  mediaType: string | null | undefined
): Promise<TranscriptionResult | null> {
  if (!ctx.apiKey || !mediaUrl) return null;
  const model = ctx.transcriptionModel || DEFAULT_TRANSCRIPTION_MODEL;

  let resp: Response;
  try {
    resp = await fetch(mediaUrl);
  } catch {
    console.warn("[media] download failed");
    return null;
  }
  if (!resp.ok) return null;

  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_MEDIA_BYTES) return null;
  const mime = resp.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;

  const kind = mediaKind(mediaType);
  const ext = (mediaUrl.split("?")[0].split(".").pop() || "bin").slice(0, 8);
  const content: Array<Record<string, unknown>> = [{ type: "text", text: MEDIA_PROMPTS[kind] }];
  if (kind === "image") {
    content.push({ type: "image_url", image_url: { url: dataUrl } });
  } else {
    content.push({ type: "file", file: { filename: `media.${ext}`, file_data: dataUrl } });
  }

  const inputTokens = Math.ceil(bytes.byteLength / 700) + 60; // aproximação até o usage real
  try {
    const apiResp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.apiKey}`,
        "HTTP-Referer": "https://consertia.app",
        "X-Title": "ConsertIA",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        max_tokens: 1200,
        temperature: 0.1,
      }),
    });
    const data = await apiResp.json();
    if (!apiResp.ok || data?.error) {
      console.warn("[media] transcription failed:", data?.error?.message ?? apiResp.status);
      return null;
    }
    const text = (data.choices?.[0]?.message?.content ?? "").toString().trim();
    if (!text) return null;
    const outTokens = Number(data.usage?.completion_tokens ?? 0);
    const inTokens = Number(data.usage?.prompt_tokens ?? inputTokens);

    // Consome a cota do plano da empresa e registra no histórico de logs
    await trackUsage(ctx.supabase, ctx.tenantId, inTokens, outTokens, 0);
    await ctx.supabase.from("ai_logs").insert({
      tenant_id: ctx.tenantId,
      conversation_id: ctx.conversation.id,
      provider: "openrouter",
      model,
      input_tokens: inTokens,
      output_tokens: outTokens,
      cost: 0,
      response_time_ms: 0,
      success: true,
      error_message: `transcricao:${kind}`,
    });

    return { text, inputTokens: inTokens, outputTokens: outTokens };
  } catch (err) {
    console.warn("[media] transcription error:", (err as Error).message);
    return null;
  }
}
