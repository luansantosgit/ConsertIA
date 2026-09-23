-- Adiciona coluna contact_avatar na tabela conversations para foto do perfil do lead
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_avatar text;
