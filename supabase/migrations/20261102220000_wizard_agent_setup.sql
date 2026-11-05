-- ============================================================
-- Wizard: etapa "Configure seu agente de IA" (Issue #95)
--
-- As escolhas do lead na etapa de configuracao do agente ficam
-- na sessao de onboarding e sao aplicadas em ai_agent_settings
-- quando o cadastro e finalizado (pagamento confirmado).
--
-- presentation_style: como o agente se apresenta (tom do prompt)
-- ============================================================

-- 1. Config do agente escolhida no wizard (guardada na sessao)
alter table public.onboarding_sessions add column if not exists agent_name text;
alter table public.onboarding_sessions add column if not exists agent_presentation text;
alter table public.onboarding_sessions add column if not exists agent_greeting boolean;
alter table public.onboarding_sessions add column if not exists agent_auto_schedule boolean;
alter table public.onboarding_sessions add column if not exists agent_auto_os boolean;

-- 2. Estilo de apresentacao do agente (prompt)
alter table public.ai_agent_settings
  add column if not exists presentation_style text not null default 'amigavel';

-- 3. Tabela nova do wizard nao precisa de RLS (acesso via service role)
--    (onboarding_sessions ja e acessada so por service role nas edges)
