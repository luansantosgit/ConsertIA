-- Compreensão de mídias pelo agente: modelo multimodal configurável + transcrição persistida
ALTER TABLE platform_ai_config
  ADD COLUMN IF NOT EXISTS transcription_model text NOT NULL DEFAULT 'google/gemini-3.1-flash-lite';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_transcription text;
