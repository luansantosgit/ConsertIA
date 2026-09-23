-- Alinha stock_movements com o front: colunas notes e reference_id
alter table stock_movements add column if not exists notes text;
alter table stock_movements add column if not exists reference_id text;
