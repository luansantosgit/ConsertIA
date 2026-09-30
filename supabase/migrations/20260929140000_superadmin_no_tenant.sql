-- ============================================================
-- Superadmin nao pertence a nenhuma empresa: e o usuario master
-- do painel superadmin. Remove tenant_id de usuarios superadmin
-- para que nao aparecam na lista de usuarios das empresas e nao
-- consumam assento do plano.
-- ============================================================
update users set tenant_id = null where role = 'superadmin' and tenant_id is not null;
