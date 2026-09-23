-- Adiciona coluna pinned para fixar conversas no topo
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
