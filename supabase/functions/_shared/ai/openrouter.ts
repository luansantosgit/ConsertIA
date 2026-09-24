import type { AgentContext, ChatMessagePayload } from "./types.ts";
import { toolDefinitions, executeTool } from "./tools.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOOL_ROUNDS = 8;
const TOOL_RESULT_KEEP = 300;

/** Tools de etapa única: após usadas, saem das definitions (economia + reforço anti-repetição). */
const SINGLE_USE_TOOLS = new Set([
  "find_part",
  "send_pre_quote_templates",
  "build_quote",
  "create_service_order",
  "schedule_event",
]);

function activeToolDefinitions(ctx: AgentContext) {
  return toolDefinitions.filter((t) => {
    const name = t.function.name;
    if (SINGLE_USE_TOOLS.has(name) && ctx.toolsUsed.includes(name)) return false;
    if (name === "create_service_order" && !ctx.agent.auto_os_enabled) return false;
    if (name === "schedule_event" && !ctx.agent.auto_schedule_enabled) return false;
    return true;
  });
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message: string };
}

async function callOpenRouter(ctx: AgentContext, messages: ChatMessagePayload[], withTools: boolean): Promise<OpenRouterResponse> {
  const resp = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.apiKey}`,
      "HTTP-Referer": "https://consertia.app",
      "X-Title": "ConsertIA",
    },
    body: JSON.stringify({
      model: ctx.agent.openrouter_model,
      messages,
      ...(withTools && activeToolDefinitions(ctx).length > 0
        ? { tools: activeToolDefinitions(ctx), tool_choice: "auto" }
        : {}),
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });
  const data = (await resp.json()) as OpenRouterResponse;
  if (!resp.ok || data.error) {
    throw new Error(data.error?.message ?? `OpenRouter HTTP ${resp.status}`);
  }
  return data;
}

export interface AgentLoopResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

/** Após o round de uso, resultados de tools ficam resumidos para não inflar os rounds seguintes. */
function pruneOldToolResults(messages: ChatMessagePayload[], keepFrom: number): void {
  for (let i = 0; i < keepFrom; i++) {
    const m = messages[i];
    if (m.role === "tool" && typeof m.content === "string" && m.content.length > TOOL_RESULT_KEEP) {
      m.content = m.content.slice(0, TOOL_RESULT_KEEP) + " …(resumido)";
    }
  }
}

export async function runAgentLoop(ctx: AgentContext, systemPrompt: string, history: ChatMessagePayload[]): Promise<AgentLoopResult> {
  const messages: ChatMessagePayload[] = [{ role: "system", content: systemPrompt }, ...history];
  let inputTokens = 0;
  let outputTokens = 0;
  let lastToolResultStart = messages.length;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (round > 0) pruneOldToolResults(messages, lastToolResultStart);
      const data = await callOpenRouter(ctx, messages, true);
      inputTokens += data.usage?.prompt_tokens ?? 0;
      outputTokens += data.usage?.completion_tokens ?? 0;

      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("Resposta vazia do modelo");

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: choice.content ?? "", tool_calls: choice.tool_calls });
        lastToolResultStart = messages.length;
        for (const toolCall of choice.tool_calls) {
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = await executeTool(ctx, toolCall.function.name, args);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return { content: choice.content ?? "", inputTokens, outputTokens };
    }
    return {
      content: "Desculpe, demorei um pouco aqui 😅 Já vou chamar um atendente da equipe pra te ajudar melhor!",
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    return { content: "", inputTokens, outputTokens, error: (err as Error).message };
  }
}
