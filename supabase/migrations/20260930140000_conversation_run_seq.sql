-- Interrupt & merge: execução em andamento é invalidada quando chega mensagem nova;
-- a resposta antiga é descartada nos checkpoints e tudo é reprocessado num turno único.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_run_marker text;
