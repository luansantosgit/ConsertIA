-- Colunas usadas pelo painel superadmin no cadastro de empresas
-- (SuperAdminCompanies): e-mail do administrador e cor da marca.
alter table tenants add column if not exists admin_email text;
alter table tenants add column if not exists theme_color text;
