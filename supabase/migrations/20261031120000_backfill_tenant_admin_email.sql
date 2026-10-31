-- Backfill: tenants criados pelo wizard gravavam o e-mail do admin apenas
-- em onboarding_sessions (o admin_email ficava vazio no modal de empresas).
-- Fontes: usuario admin do tenant; fallback e-mail do onboarding.

DO $$
BEGIN
  UPDATE tenants t
  SET admin_email = COALESCE(
    (SELECT u.email FROM users u
      WHERE u.tenant_id = t.id AND u.role = 'admin'
      ORDER BY u.created_at ASC LIMIT 1),
    (SELECT s.email FROM onboarding_sessions s
      WHERE s.tenant_id = t.id AND s.status = 'paid'
      ORDER BY s.created_at ASC LIMIT 1)
  )
  WHERE t.admin_email IS NULL OR t.admin_email = '';
END $$;
