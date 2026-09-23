import type { AgentContext } from "./types.ts";
import { executeTool } from "./tools.ts";

const NAME_QUESTION_PATTERN =
  /(qual(é| e)? (o )?(seu )?nome|seu nome\?|como (te|posso|pode|podo|você|voce|eu) chamo|chamar( você| voce|-o|-a|la|lo)\?|me informe (o )?seu nome|como (te|posso) chamar)/i;

const NON_NAME_WORDS = new Set([
  "ok", "blz", "beleza", "sim", "não", "nao", "claro", "certo", "isso", "ah", "aí", "eai",
  "obrigado", "obrigada", "obrigadinho", "valeu", "vlw", "brigado", "agradeco", "agradeço",
  "tudo", "bem", "bom", "dia", "boa", "tarde", "noite", "oi", "olá", "ola", "opa", "hi",
  "quanto", "custa", "custa?", "valor", "preço", "preco", "orçamento", "orcamento", "quanto?",
  "quero", "preciso", "gostaria", "agendar", "agendamento", "amanhã", "amanha", "hoje", "depois",
  "tela", "vidro", "bateria", "conector", "aparelho", "celular", "cel", "fone", "carregador",
  "galaxy", "iphone", "motorola", "asus", "xiaomi", "redmi", "apple", "samsung", "lenovo",
  "meu", "minha", "nome", "é", "e", "sou", "o", "a", "de", "da", "do", "pode", "poder", "chamar", "chamo",
]);

interface MsgRow {
  content: string | null;
  direction: string;
  sender_type: string | null;
}

function extractSpokenName(text: string): string | null {
  const clean = text.trim();
  if (!clean || /\n/.test(clean)) return null;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return null;

  const stripped = clean
    .replace(/^(oi|olá|ola|opa|e aí|eai|hi)[,!.]?\s+/i, "")
    .replace(/^(meu nome (é|e)|sou (o |a )|é (o |a )|pode (me )?chamar de |pode ser |me chamo )/i, "")
    .replace(/[.!,?]+$/, "")
    .trim();
  if (stripped.length < 2 || stripped.length > 60) return null;

  const strippedWords = stripped.split(/\s+/).filter(Boolean);
  const allCommon = strippedWords.every((w) => NON_NAME_WORDS.has(w.toLowerCase()));
  if (allCommon) return null;
  return stripped;
}

export async function tryCaptureName(ctx: AgentContext): Promise<void> {
  if (!ctx.agent.ask_name_enabled) return;
  if (ctx.conversation.customer_name_confirmed === true) return;

  const { data: rows } = await ctx.supabase
    .from("messages")
    .select("content, direction, sender_type")
    .eq("conversation_id", ctx.conversation.id)
    .order("created_at", { ascending: true })
    .limit(30);
  const recent = (rows ?? []) as MsgRow[];

  let questionIndex = -1;
  for (let i = recent.length - 1; i >= 0; i--) {
    const row = recent[i];
    const isOut = row.direction === "outbound" || row.sender_type === "ai";
    if (isOut && NAME_QUESTION_PATTERN.test(row.content ?? "")) {
      questionIndex = i;
      break;
    }
  }
  if (questionIndex === -1) return;

  for (let i = recent.length - 1; i > questionIndex; i--) {
    const row = recent[i];
    const isIn = row.direction === "inbound" && row.sender_type !== "ai";
    if (!isIn) continue;
    const name = extractSpokenName(row.content ?? "");
    if (name && name.toLowerCase() !== (ctx.contactName ?? "").toLowerCase()) {
      await executeTool(ctx, "update_customer_name", { name });
    }
    return;
  }
}
