-- Mídia nas mensagens (imagem, video, audio, documento)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
