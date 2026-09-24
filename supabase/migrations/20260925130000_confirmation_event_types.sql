-- Tipos de evento que disparam lembrete de confirmação (Issue #26)
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS confirmation_event_types jsonb NOT NULL
  DEFAULT '["os", "delivery", "meeting", "reminder", "other"]'::jsonb;
