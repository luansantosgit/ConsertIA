-- ============================================================
-- Adiciona "reminder" e "other" ao enum event_type de
-- calendar_events (o filtro de lembretes falhava com erro
-- "invalid input value for enum event_type: reminder")
-- ============================================================
DO $$ begin
  alter type event_type add value if not exists 'reminder';
exception when duplicate_object then null; end $$;

DO $$ begin
  alter type event_type add value if not exists 'other';
exception when duplicate_object then null; end $$;
