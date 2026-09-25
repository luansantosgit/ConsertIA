-- Contexto do orçamento persistido por conversa + gatilho com debounce do agente
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS quote_context jsonb;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_trigger_token text;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_trigger_after timestamptz;
