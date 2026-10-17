-- Exclusão em massa no servidor: uma única chamada RPC cometa no banco
-- na hora (imune a reload da página). O loop anterior rodava no navegador
-- e morria no meio se a página recarregasse.
create or replace function delete_catalog_items(p_ids uuid[])
returns integer
language sql
as $fn$
  with deleted as (
    delete from products
    where id = any(p_ids)
      and tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    returning 1
  )
  select count(*)::integer from deleted;
$fn$;
