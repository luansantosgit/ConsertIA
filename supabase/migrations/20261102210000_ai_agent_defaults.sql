-- ============================================================
-- Defaults de IA por tenant (Issue #94)
--
-- Tenant criado pelo wizard (lead) nascia com:
--   - ai_agent_settings.active = false  (default do banco)
--   - ai_agent_settings.ask_name_enabled = false
--   - ai_agent_settings.openrouter_model = 'openai/gpt-4o-mini'
--     (modelo fora da lista liberada => aviso "modelo atual nao esta
--      na lista liberada" na tela de Integracoes)
--
-- Alem disso, empresa criada pelo superadmin nao tinha NENHUMA linha em
-- ai_agent_settings — e sem a linha o agente nem roda (o runtime faz
-- `if (!agentRes.data) return null`).
--
-- Esta migration:
--  1. muda os defaults da tabela (agente ativo + perguntar nome)
--  2. faz o default do modelo acompanhar o padrao da plataforma
--  3. alinha modelos gravados fora da lista liberada
--  4. cria as rows que faltam para tenants ativos
-- ============================================================

-- 1. Defaults da tabela: agente ativo e perguntando o nome
alter table public.ai_agent_settings alter column active set default true;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_agent_settings'
      and column_name = 'ask_name_enabled'
  ) then
    alter table public.ai_agent_settings alter column ask_name_enabled set default true;
  end if;
end $$;

-- 2. Default do modelo passa a acompanhar o padrao liberado pela plataforma
do $$
declare
  model text;
begin
  select default_model into model from public.platform_ai_config limit 1;
  if model is not null and model <> '' then
    execute format(
      'alter table public.ai_agent_settings alter column openrouter_model set default %L',
      model
    );
  end if;
end $$;

-- 3a. Modo "all": alinha tenants (cobertos pelo token da plataforma) cujo
--     modelo gravado nao esta na lista liberada GLOBAL
update public.ai_agent_settings s
set openrouter_model = p.default_model,
    updated_at = now()
from public.platform_ai_config p
cross join lateral (
  select array_agg(value) as models
  from jsonb_array_elements_text(coalesce(p.allowed_models, '[]'::jsonb))
) m
where p.distribution_mode = 'all'
  and array_length(m.models, 1) > 0
  and p.default_model is not null
  and p.default_model = any(m.models)
  and not (s.openrouter_model = any(m.models))
  and coalesce(
    (select e.use_platform_token from public.tenant_ai_entitlements e where e.tenant_id = s.tenant_id),
    true
  ) is not false;

-- 3b. Modo "selected": alinha pela lista liberada da propria empresa
update public.ai_agent_settings s
set openrouter_model = e.default_model,
    updated_at = now()
from public.tenant_ai_entitlements e
cross join lateral (
  select array_agg(value) as models
  from jsonb_array_elements_text(coalesce(e.allowed_models, '[]'::jsonb))
) m
where e.tenant_id = s.tenant_id
  and e.use_platform_token is true
  and array_length(m.models, 1) > 0
  and e.default_model is not null
  and e.default_model = any(m.models)
  and not (s.openrouter_model = any(m.models));

-- 4. Cria as rows que faltam (tenants ativos): agente ativo, perguntando
--    o nome e no modelo liberado (padrao global ou da empresa)
insert into public.ai_agent_settings (
  tenant_id, active, ask_name_enabled, openrouter_model
)
select
  t.id,
  true,
  true,
  coalesce(
    case
      when coalesce(pm.distribution_mode, '') = 'all' then
        case
          when pm.default_model is not null
            and pm.default_model = any(array(
              select jsonb_array_elements_text(coalesce(pm.allowed_models, '[]'::jsonb))
            ))
          then pm.default_model
          else (array(
            select jsonb_array_elements_text(coalesce(pm.allowed_models, '[]'::jsonb))
          ))[1]
        end
      else
        case
          when em.default_model is not null
            and em.default_model = any(array(
              select jsonb_array_elements_text(coalesce(em.allowed_models, '[]'::jsonb))
            ))
          then em.default_model
          else (array(
            select jsonb_array_elements_text(coalesce(em.allowed_models, '[]'::jsonb))
          ))[1]
        end
    end,
    'openai/gpt-4o-mini'
  )
from public.tenants t
left join lateral (
  select * from public.platform_ai_config limit 1
) pm on true
left join lateral (
  select * from public.tenant_ai_entitlements e where e.tenant_id = t.id limit 1
) em on true
where t.active is true
  and not exists (
    select 1 from public.ai_agent_settings s where s.tenant_id = t.id
  );
