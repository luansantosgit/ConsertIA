-- Aplica o tema global a TODAS as empresas em UMA única chamada.
-- Antes o frontend fazia N upserts sequenciais (um por tenant, cada um
-- carregando o payload com a logo base64) — 10s+ com muitas empresas.
create or replace function apply_theme_to_all_tenants(p_theme jsonb)
returns integer
language sql
security definer
set search_path = public
as $fn$
  with applied as (
    insert into tenant_themes (
      tenant_id, primary_color, primary_dark, logo_url, logo_type,
      logo_text, favicon_url, sidebar_dark, dark_logo_url, logo_dark_mode, updated_at
    )
    select
      t.id,
      p_theme->>'primary_color',
      p_theme->>'primary_dark',
      p_theme->>'logo_url',
      p_theme->>'logo_type',
      coalesce(p_theme->>'logo_text', 'DeeperIA'),
      p_theme->>'favicon_url',
      coalesce((p_theme->>'sidebar_dark')::boolean, false),
      p_theme->>'dark_logo_url',
      coalesce((p_theme->>'logo_dark_mode')::boolean, false),
      now()
    from tenants t
    on conflict (tenant_id) do update set
      primary_color = excluded.primary_color,
      primary_dark = excluded.primary_dark,
      logo_url = excluded.logo_url,
      logo_type = excluded.logo_type,
      logo_text = excluded.logo_text,
      favicon_url = excluded.favicon_url,
      sidebar_dark = excluded.sidebar_dark,
      dark_logo_url = excluded.dark_logo_url,
      logo_dark_mode = excluded.logo_dark_mode,
      updated_at = excluded.updated_at
    returning 1
  )
  select count(*)::integer from applied;
$fn$;

revoke execute on function apply_theme_to_all_tenants(jsonb) from public, anon;
