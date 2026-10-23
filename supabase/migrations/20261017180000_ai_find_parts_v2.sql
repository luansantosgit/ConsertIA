-- Busca v2: match de modelo rigoroso (sem cross-model por substring), filtro de
-- tipo de peça rígido e suporte a variações (qualidade/acabamento) do mesmo modelo.

drop function if exists ai_find_parts(uuid, text, text, text);

create or replace function ai_part_matches(p_name text, p_ptype text, p_part text) returns boolean
language sql immutable as $$
  select coalesce(ai_canon_part(p_part), '') = ''
    or coalesce(ai_canon_part(p_ptype), '') = ai_canon_part(p_part)
    or p_name ~* (
      case ai_canon_part(p_part)
        when 'tela' then '(tela|display|lcd|touch|screen)'
        when 'vidro' then '(vidro|glass|courier)'
        when 'bateria' then '(bateria|battery|batt)'
        when 'conector' then '(conector|carga|entrada|port|dock)'
        when 'camera' then '(camera|c[âa]mera|lente)'
        when 'altofalante' then '(alto.?falante|speaker|boca)'
        when 'tampa' then '(tampa|traseira|back)'
        else '%' || coalesce(ai_canon_part(p_part), '') || '%'
      end
    )
$$;

create or replace function ai_find_parts(p_tenant uuid, p_brand text, p_model text, p_part text)
returns table (
  id uuid, name text, price numeric, stock int,
  part_type text, device_brand text, device_model text,
  score int, match_level text, model_exact boolean
)
language plpgsql security definer set search_path = public as $$
declare
  v_model text := lower(btrim(coalesce(p_model, '')));
  v_brand text := lower(btrim(coalesce(p_brand, '')));
  v_part  text := coalesce(ai_canon_part(p_part), '');
  v_jwt_tenant text := coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '');
begin
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
        when v_model <> '' and lower(coalesce(p.device_model, '')) = v_model then 30
        when v_model <> '' and (
          lower(coalesce(p.device_model, '')) like '%' || v_model || '%'
          or lower(p.name) like '%' || v_model || '%'
        ) then 15
        when v_model <> '' and similarity(lower(coalesce(p.device_model, '') || ' ' || p.name), v_model) > 0.45 then 10
        else 0
      end)
      + (case when v_brand <> '' and lower(coalesce(p.device_brand, '')) like '%' || v_brand || '%' then 5 else 0 end)
      + (case
          when v_part <> '' and coalesce(ai_canon_part(p.part_type), '') = v_part then 15
          when v_part <> '' and ai_part_matches(p.name, p.part_type, coalesce(p_part, '')) then 12
          else 0
        end)
    )::int as score,
    (case
      when (v_model = '' or lower(coalesce(p.device_model, '')) = v_model)
        and (v_part = '' or ai_part_matches(p.name, p.part_type, coalesce(p_part, '')))
      then 'exato'
      else 'aproximado'
    end) as match_level,
    (v_model = '' or lower(coalesce(p.device_model, '')) = v_model) as model_exact
  from products p
  where p.tenant_id = p_tenant
    and p.active = true
    and (
      v_model = ''
      or lower(coalesce(p.device_model, '')) like '%' || v_model || '%'
      or lower(p.name) like '%' || v_model || '%'
      or similarity(lower(coalesce(p.device_model, '') || ' ' || p.name), v_model) > 0.45
    )
    and ai_part_matches(p.name, p.part_type, coalesce(p_part, ''))
  order by score desc, p.price asc
  limit 8;
end $$;

grant execute on function ai_find_parts(uuid, text, text, text) to authenticated, service_role;
grant execute on function ai_part_matches(text, text, text) to authenticated, service_role;
