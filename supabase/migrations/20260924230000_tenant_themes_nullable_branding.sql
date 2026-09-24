-- Permite que a empresa herde dinamicamente o nome/branding global
-- quando não define um valor próprio em tenant_themes.
alter table tenant_themes alter column logo_text drop not null;
alter table tenant_themes alter column primary_color drop not null;
alter table tenant_themes alter column primary_dark drop not null;
