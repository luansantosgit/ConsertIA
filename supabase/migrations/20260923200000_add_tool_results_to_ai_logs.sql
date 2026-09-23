-- Diagnostico: resultados das tools da IA no log (evita falhas silenciosas)
alter table ai_logs add column if not exists tool_results jsonb not null default '[]';
