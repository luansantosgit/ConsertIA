import type { AiConfig, AiLog, AiAgentSettings, AiQuoteSettings, AiDiagnosisSettings, AiPreQuoteTemplate, TenantAiEntitlement, AiTokenUsage } from '@/types';

export type { AiConfig, AiLog };

export type Section = 'personalidade' | 'comportamento' | 'templates' | 'orcamentos' | 'diagnosticos' | 'integracoes' | 'historico';

export interface NavItem {
  key: Section;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface AiSettingsState {
  agent: AiAgentSettings | null;
  quote: AiQuoteSettings | null;
  diagnosis: AiDiagnosisSettings | null;
  templates: AiPreQuoteTemplate[];
  entitlement: TenantAiEntitlement | null;
  usage: AiTokenUsage | null;
}
