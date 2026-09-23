-- Log table to debug webhook payloads
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  event text,
  payload jsonb,
  created_at timestamptz default now()
);
