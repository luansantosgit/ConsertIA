-- Ciclo de vida de agendamentos (Issue #22)
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS confirmation_asked_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_status_check') THEN
    ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_status_check
      CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show'));
  END IF;
END $$;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS schedule_confirmation_hours int;
