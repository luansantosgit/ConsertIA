import type { AgentContext, ChatMessagePayload } from "./types.ts";
import { toolDefinitions, executeTool } from "./tools.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOOL_ROUNDS = 8;

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
      ...(withTools ? { tools: toolDefinitions, tool_choice: "auto" } : {}),
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

export async function runAgentLoop(ctx: AgentContext, systemPrompt: string, history: ChatMessagePayload[]): Promise<AgentLoopResult> {
  const messages: ChatMessagePayload[] = [{ role: "system", content: systemPrompt }, ...history];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callOpenRouter(ctx, messages, true);
      inputTokens += data.usage?.prompt_tokens ?? 0;
      outputTokens += data.usage?.completion_tokens ?? 0;

      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("Resposta vazia do modelo");

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: choice.content ?? "", tool_calls: choice.tool_calls });
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
