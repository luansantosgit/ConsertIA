-- Agenda: duração configurável da janela de manutenção (padrão 60 min)
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS appointment_duration_minutes int not null default 60;
