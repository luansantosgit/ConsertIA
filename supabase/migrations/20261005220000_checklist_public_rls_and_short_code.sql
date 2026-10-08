-- Checklist público: permite acesso anônimo à OS (o UUID/short_code
-- funciona como token secreto para o cliente tirar fotos)
DO $$ begin
  create policy "anon read service_orders checklist" on service_orders
    for select to anon
    using (true);
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "anon update service_orders checklist" on service_orders
    for update to anon
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

-- Codigo amigavel da OS (6 chars, ex: E839D8) para URL do checklist
alter table service_orders add column if not exists short_code text unique;

-- Popula os registros existentes
update service_orders
set short_code = upper(replace(id::text, '-', ''))
where short_code is null;
-- Pega só os 6 primeiros chars do UUID sem hífens
update service_orders
set short_code = upper(left(replace(id::text, '-', ''), 6))
where short_code = upper(replace(id::text, '-', ''));

-- Garante unicidade adicionando sufixo se houver colisão
DO $$
declare
  r record;
  counter int;
  new_code text;
begin
  for r in (select id, short_code from service_orders where short_code is not null) loop
    counter := 1;
    new_code := r.short_code;
    while (select count(*) from service_orders where short_code = new_code and id != r.id) > 0 loop
      new_code := upper(left(replace(r.id::text, '-', ''), 6)) || counter::text;
      counter := counter + 1;
    end loop;
    if new_code != r.short_code then
      update service_orders set short_code = new_code where id = r.id;
    end if;
  end loop;
end $$;
