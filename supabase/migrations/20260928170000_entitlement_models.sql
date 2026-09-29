-- Superadmin define quais LLMs a empresa pode usar no token global e o modelo padrão
ALTER TABLE tenant_ai_entitlements
  ADD COLUMN IF NOT EXISTS allowed_models jsonb;

ALTER TABLE tenant_ai_entitlements
  ADD COLUMN IF NOT EXISTS default_model text;
