-- ============================================================
-- Permissoes por usuario: modulos do sistema que o usuario
-- pode ver/usar. Admin/superadmin tem acesso completo e ignoram
-- esta coluna.
-- ============================================================
alter table users add column if not exists permissions text[] not null default '{}';
