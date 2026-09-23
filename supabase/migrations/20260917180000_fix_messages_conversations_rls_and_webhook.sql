-- Corrige RLS de messages e conversations para garantir acesso do client
-- E garante que a publicacao Realtime esteja habilitada

-- 1. Recria politicas RLS corretas para messages
DROP POLICY IF EXISTS "TI messages" ON public.messages;
CREATE POLICY "TI messages" ON public.messages
  FOR ALL USING (
    (tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
  );

-- 2. Recria politicas RLS corretas para conversations
DROP POLICY IF EXISTS "TI conversations" ON public.conversations;
CREATE POLICY "TI conversations" ON public.conversations
  FOR ALL USING (
    (tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
  );

-- 3. Habilitar Realtime na tabela messages
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Habilitar Realtime na tabela conversations
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
