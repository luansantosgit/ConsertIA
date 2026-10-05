-- Busca híbrida de peças: exata + fuzzy (pg_trgm) + score de aderência (Issue #73)
create extension if not exists pg_trgm;

-- Canonização de tipo de peça (display/lcd/touch -> tela, etc.)
create or replace function ai_canon_part(p text) returns text
language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when p ~* '(tela|display|lcd|touch|screen)' then 'tela'
    when p ~* '(vidro|glass|courier)' then 'vidro'
    when p ~* '(bateria|battery|batt)' then 'bateria'
    when p ~* '(conector|carga|entrada|port|dock)' then 'conector'
    when p ~* '(camera|c[âa]mera|lente)' then 'camera'
    when p ~* '(alto.?falante|speaker|boca)' then 'altofalante'
    when p ~* '(tampa|traseira|back)' then 'tampa'
    else lower(btrim(p))
  end
$$;

-- Higiene do catálogo: part_type vazio/inconsistente -> inferir do próprio cadastro
update products
set part_type = ai_canon_part(coalesce(nullif(btrim(part_type), ''), name))
where active = true
  and (part_type is null or btrim(part_type) = '' or part_type <> ai_canon_part(coalesce(nullif(btrim(part_type), ''), name)));

-- RPC: busca em camadas (match exato -> trigram fuzzy) com score e match_level
create or replace function ai_find_parts(p_tenant uuid, p_brand text, p_model text, p_part text)
returns table (
  id uuid, name text, price numeric, stock int,
  part_type text, device_brand text, device_model text,
  score int, match_level text
)
language plpgsql security definer set search_path = public as $$
declare
  v_model text := lower(btrim(coalesce(p_model, '')));
  v_brand text := lower(btrim(coalesce(p_brand, '')));
  v_part  text := coalesce(ai_canon_part(p_part), '');
  v_jwt_tenant text := coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '');
begin
  -- Isolamento: authenticated só busca no próprio tenant; service role (edge) passa
  if v_jwt_tenant <> '' and v_jwt_tenant <> p_tenant::text then
    raise exception 'tenant mismatch';
  end if;

  if v_model = '' and v_part = '' then
    return;
  end if;

  return query
  select
    p.id, p.name, p.price, p.stock_quantity::int, p.part_type, p.device_brand, p.device_model,
    (
      (case
        when v_model <> '' and (
          lower(coalesce(p.device_model, '')) like '%' || v_model || '%'
          or lower(p.name) like '%' || v_model || '%'
        ) then 30
        when v_model <> '' and similarity(lower(coalesce(p.device_model, '') || ' ' || p.name), v_model) > 0.30 then 15
        else 0
      end)
      + (case when v_brand <> '' and lower(coalesce(p.device_brand, '')) like '%' || v_brand || '%' then 5 else 0 end)
      + (case
          when v_part <> '' and coalesce(p.part_type, '') = v_part then 15
          when v_part <> '' and p.name ilike '%' || v_part || '%' then 10
          else 0
        end)
    )::int as score,
    (case
      when
        (v_model = '' or lower(coalesce(p.device_model, '')) like '%' || v_model || '%'
          or lower(p.name) like '%' || v_model || '%')
        and (v_part = '' or coalesce(p.part_type, '') = v_part or p.name ilike '%' || v_part || '%')
      then 'exato'
      else 'aproximado'
    end) as match_level
  from products p
  where p.tenant_id = p_tenant
    and p.active = true
    and (
      v_model = ''
      or lower(coalesce(p.device_model, '')) like '%' || v_model || '%'
      or lower(p.name) like '%' || v_model || '%'
      or similarity(lower(coalesce(p.device_model, '') || ' ' || p.name), v_model) > 0.30
    )
    and (
      v_part = ''
      or coalesce(p.part_type, '') = v_part
      or p.name ilike '%' || v_part || '%'
      or similarity(lower(p.name), coalesce(p_model, '') || ' ' || coalesce(p_part, '')) > 0.25
    )
  order by score desc, p.price asc
  limit 5;
end $$;

grant execute on function ai_find_parts(uuid, text, text, text) to authenticated, service_role;
grant execute on function ai_canon_part(text) to authenticated, service_role;
