-- Corrige políticas RLS na tabela users
-- O auth.jwt() ->> 'role' retorna 'authenticated' (role do Postgres), não o role customizado

-- Remove políticas incorretas
DROP POLICY IF EXISTS "Superadmin full access users" ON public.users;
DROP POLICY IF EXISTS "TI users" ON public.users;

-- Permite que qualquer usuário autenticado leia seu próprio perfil (by id)
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Superadmin acessa tudo
DROP POLICY IF EXISTS "Superadmin full access users" ON public.users;
CREATE POLICY "Superadmin full access users" ON public.users
  FOR ALL USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
  );

-- Usuários veem apenas seu tenant
DROP POLICY IF EXISTS "Users see own tenant" ON public.users;
CREATE POLICY "Users see own tenant" ON public.users
  FOR SELECT USING (
    tenant_id::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
  );
