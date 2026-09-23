-- Personalizacao da OS: peca e mao de obra reais (sem split 60/40 inventado)
alter table service_orders add column if not exists part_name text;
alter table service_orders add column if not exists part_amount numeric(10,2);
alter table service_orders add column if not exists labor_amount numeric(10,2);
