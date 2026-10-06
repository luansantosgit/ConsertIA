-- Logo específico para o PDF das OS (menu Empresa).
-- Prioridade no PDF: pdf_logo_url > tenant_themes.logo_url > sigla
alter table tenant_settings add column if not exists pdf_logo_url text;
