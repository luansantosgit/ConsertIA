export interface OpenRouterModel {
  id: string;
  label: string;
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini — econômico e rápido' },
  { id: 'openai/gpt-4o', label: 'GPT-4o — mais assertivo (multimodal)' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash — rápido e econômico' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro — mais assertivo' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet — conversacional' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 — rápido e barato' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B — open source' },
];

export function modelLabel(id: string): string {
  return OPENROUTER_MODELS.find(m => m.id === id)?.label ?? id;
}
