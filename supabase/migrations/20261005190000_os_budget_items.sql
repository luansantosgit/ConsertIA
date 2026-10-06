-- Itens do orçamento (múltiplas linhas com nome e valor)
alter table service_orders add column if not exists budget_items jsonb not null default '[]';
