-- Corrige platform_settings: seed row + RLS para authenticated

-- 1. Inserir row padrao se nao existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1) THEN
    INSERT INTO platform_settings (id, hybrid_mode, hybrid_random_percentage)
    VALUES (gen_random_uuid(), 'integral', 50);
  END IF;
END $$;

-- 2. Dropar policy antiga de superadmin e recriar com acesso authenticated
DROP POLICY IF EXISTS "Superadmin full access platform_settings" ON platform_settings;

CREATE POLICY "Authenticated read platform_settings" ON platform_settings
  FOR SELECT USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') != ''
  );

CREATE POLICY "Admin full access platform_settings" ON platform_settings
  FOR ALL USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('superadmin', 'admin')
  );
