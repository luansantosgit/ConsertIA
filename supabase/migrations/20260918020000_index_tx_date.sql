-- Filtro de periodo do financeiro por data de negocio
create index if not exists idx_tx_tenant_date on transactions(tenant_id, date);
