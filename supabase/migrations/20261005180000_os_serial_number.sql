-- Numero de serie do aparelho preenchido manualmente pelo atendente
-- na OS (nao pela IA). Guardado direto na service_orders para nao
-- depender do cadastro de equipamento.
alter table service_orders add column if not exists serial_number text;
