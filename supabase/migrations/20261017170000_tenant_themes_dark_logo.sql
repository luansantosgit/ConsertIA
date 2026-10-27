-- Logo dedicada ao modo escuro: colunas em tenant_themes
-- (global_settings já guarda no JSONB theme, mas o save replica o
-- payload para cada tenant — a tabela precisa das colunas)
alter table tenant_themes add column if not exists dark_logo_url text;
alter table tenant_themes add column if not exists logo_dark_mode boolean not null default false;
