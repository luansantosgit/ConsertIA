-- ============================================================
-- Perfil do próprio usuário (issue #102)
--
-- A tabela `users` só permite escrita para admin do tenant
-- (policy "TI users admin write"). Para o usuário editar o próprio
-- nome em qualquer cargo (inclusive mobile, onde não há tela de
-- Configurações), criamos uma função SECURITY DEFINER que atualiza
-- APENAS o próprio nome — sem abrir brecha para role/tenant_id.
-- ============================================================

create or replace function public.update_my_profile(p_name text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.users;
begin
  update public.users
     set name = coalesce(nullif(trim(p_name), ''), name),
         updated_at = now()
   where id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'perfil_nao_encontrado';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_my_profile(text) from public;
grant execute on function public.update_my_profile(text) to authenticated;
