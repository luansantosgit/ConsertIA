-- Nome do equipamento preenchido no form da OS (texto livre, digitado
-- pelo atendente). Persiste direto na service_orders.
alter table service_orders add column if not exists equipment_name text;
