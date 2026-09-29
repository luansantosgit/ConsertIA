-- Modelos permitidos/padrão GLOBAIS (usados quando a distribuição do token é "all")
ALTER TABLE platform_ai_config
  ADD COLUMN IF NOT EXISTS allowed_models jsonb;

ALTER TABLE platform_ai_config
  ADD COLUMN IF NOT EXISTS default_model text;

-- View legível pelo tenant (sem expor o token da plataforma):
-- resolve a lista de modelos conforme o modo de distribuição
create or replace view v_ai_model_options as
  select distribution_mode, allowed_models, default_model
  from platform_ai_config;

grant select on v_ai_model_options to authenticated;
