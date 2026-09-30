-- Lock de execução do agente por conversa: evita respostas duplicadas quando
-- mensagens chegam durante um atendimento em andamento (execuções sobrepostas).
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_processing_until timestamptz;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_pending boolean not null default false;
