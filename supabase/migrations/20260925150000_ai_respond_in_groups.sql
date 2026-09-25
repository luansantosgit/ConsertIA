-- Agente de IA em grupos: opt-in explícito, padrão desativado (Issue #29)
ALTER TABLE ai_agent_settings
  ADD COLUMN IF NOT EXISTS respond_in_groups boolean not null default false;
