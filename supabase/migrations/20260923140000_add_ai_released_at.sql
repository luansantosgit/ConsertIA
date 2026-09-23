-- Marca quando a conversa foi devolvida ao agente de IA (release)
alter table conversations add column if not exists ai_released_at timestamptz;
