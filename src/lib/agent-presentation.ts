// ============================================================
// Estilos de apresentação do agente (Issue #95 / #97)
// Fonte única usada pelo wizard público (/comece-agora) e pelo
// painel (Agente de IA → Personalidade). O valor gravado é
// `ai_agent_settings.presentation_style` e é consumido de verdade
// pelo prompt do runtime (`_shared/ai/prompt.ts` → presentationTone).
// ============================================================
import type { AgentPresentationStyle } from '@/types';

export type { AgentPresentationStyle };

export interface AgentPresentationOption {
  id: AgentPresentationStyle;
  label: string;
  hint: string;
}

/** Opções de tom do agente (ordem exibida no wizard e no painel). */
export const AGENT_PRESENTATIONS: AgentPresentationOption[] = [
  { id: 'amigavel', label: 'Amigável', hint: 'simpática e acolhedora' },
  { id: 'formal', label: 'Formal', hint: 'cordial e profissional' },
  { id: 'tecnico', label: 'Técnica', hint: 'objetiva e clara' },
  { id: 'proximo', label: 'Próxima', hint: 'direta e sem enrolação' },
];

export const DEFAULT_AGENT_PRESENTATION: AgentPresentationStyle = 'amigavel';

/** Normaliza um valor vindo do banco/sessão para um estilo válido. */
export function normalizeAgentPresentation(value: unknown): AgentPresentationStyle {
  const raw = String(value ?? '').trim().toLowerCase();
  const found = AGENT_PRESENTATIONS.find(o => o.id === raw);
  return found ? found.id : DEFAULT_AGENT_PRESENTATION;
}
