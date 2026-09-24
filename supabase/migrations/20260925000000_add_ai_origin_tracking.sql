-- Tracking de origem: distingue registros criados pelo Agente de IA dos criados manualmente
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'user';

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual';
