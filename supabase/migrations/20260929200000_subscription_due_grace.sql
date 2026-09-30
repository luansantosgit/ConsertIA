-- ============================================================
-- Vencimento da assinatura + carência
--   - asaas_config.subscription_grace_days: carência GLOBAL
--     (dias após o vencimento antes de bloquear o sistema/IA)
--   - tenants.subscription_due_date: dia de vencimento da
--     assinatura de cada empresa (definido no cadastro)
--   - tenants.subscription_extra_days: prazo EXTRA individual,
--     concedido pelo superadmin a empresas com fatura vencida
-- ============================================================
alter table asaas_config add column if not exists subscription_grace_days int not null default 7;
alter table tenants add column if not exists subscription_due_date date;
alter table tenants add column if not exists subscription_extra_days int not null default 0;

-- Backfill: 30 dias a partir de hoje para nao bloquear ninguem
update tenants set subscription_due_date = current_date + 30
where subscription_due_date is null;
