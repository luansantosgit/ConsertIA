-- ============================================================
-- Resposta rápida padrão: horário de atendimento (/horario)
-- Igual à de endereço — semeada com os dados reais de cada
-- empresa (tenant_settings.business_hours), com defaults
-- Seg-Sex 08:00-18:00, Sáb 08:00-12:00, Dom fechado.
-- ============================================================
insert into quick_replies (tenant_id, shortcut, title, parts, is_default)
select
  ts.tenant_id,
  'horario',
  'Horário de atendimento',
  jsonb_build_array(jsonb_build_object(
    'type', 'text',
    'text', 'Horário de atendimento: ' || string_agg(seg, ' · ' order by ord)
  )),
  true
from tenant_settings ts
cross join lateral (values
  ('Segunda', ts.business_hours->'1', 1),
  ('Terça',   ts.business_hours->'2', 2),
  ('Quarta',  ts.business_hours->'3', 3),
  ('Quinta',  ts.business_hours->'4', 4),
  ('Sexta',   ts.business_hours->'5', 5),
  ('Sábado',  ts.business_hours->'6', 6),
  ('Domingo', ts.business_hours->'0', 0)
) as d(label, h, ord)
cross join lateral (
  select case
    when coalesce((h->>'open')::boolean, ord between 1 and 6)
    then label || ' ' || coalesce(h->>'start', '08:00') || ' às ' ||
         coalesce(h->>'end', case when ord = 6 then '12:00' else '18:00' end)
    else label || ': fechado'
  end as seg
) s
group by ts.tenant_id
on conflict (tenant_id, shortcut) do nothing;
