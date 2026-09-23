-- Corrige RLS das tabelas novas (WhatsApp) para usar user_metadata no JWT
-- O padrão correto é: auth.jwt() -> 'user_metadata' ->> 'tenant_id'
-- E NÃO: auth.jwt() ->> 'tenant_id'

-- Connections
DROP POLICY IF EXISTS "Superadmin full access connections" ON connections;
CREATE POLICY "Superadmin full access connections" ON connections
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

DROP POLICY IF EXISTS "TI connections" ON connections;
CREATE POLICY "TI connections" ON connections
  FOR ALL USING ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));

-- conversation_hybrid_state
DROP POLICY IF EXISTS "Superadmin full access hybrid_state" ON conversation_hybrid_state;
CREATE POLICY "Superadmin full access hybrid_state" ON conversation_hybrid_state
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

-- whatsapp_official_webhook_events
DROP POLICY IF EXISTS "Superadmin full access webhook_events" ON whatsapp_official_webhook_events;
CREATE POLICY "Superadmin full access webhook_events" ON whatsapp_official_webhook_events
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

DROP POLICY IF EXISTS "TI webhook_events" ON whatsapp_official_webhook_events;
CREATE POLICY "TI webhook_events" ON whatsapp_official_webhook_events
  FOR ALL USING ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));

-- wacalls_sessions
DROP POLICY IF EXISTS "Superadmin full access wacalls_sessions" ON wacalls_sessions;
CREATE POLICY "Superadmin full access wacalls_sessions" ON wacalls_sessions
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

DROP POLICY IF EXISTS "TI wacalls_sessions" ON wacalls_sessions;
CREATE POLICY "TI wacalls_sessions" ON wacalls_sessions
  FOR ALL USING ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));

-- wacalls_calls
DROP POLICY IF EXISTS "Superadmin full access wacalls_calls" ON wacalls_calls;
CREATE POLICY "Superadmin full access wacalls_calls" ON wacalls_calls
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

DROP POLICY IF EXISTS "TI wacalls_calls" ON wacalls_calls;
CREATE POLICY "TI wacalls_calls" ON wacalls_calls
  FOR ALL USING ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));

-- wacalls_plan_limits
DROP POLICY IF EXISTS "Superadmin full access wacalls_plan_limits" ON wacalls_plan_limits;
CREATE POLICY "Superadmin full access wacalls_plan_limits" ON wacalls_plan_limits
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

DROP POLICY IF EXISTS "Authenticated read wacalls_plan_limits" ON wacalls_plan_limits;
CREATE POLICY "Authenticated read wacalls_plan_limits" ON wacalls_plan_limits
  FOR SELECT USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') != '');

-- platform_settings
DROP POLICY IF EXISTS "Superadmin full access platform_settings" ON platform_settings;
CREATE POLICY "Superadmin full access platform_settings" ON platform_settings
  FOR ALL USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
