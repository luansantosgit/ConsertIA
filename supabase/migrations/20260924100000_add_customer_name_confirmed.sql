-- Marca se o nome do lead foi confirmado pelo cliente (vs nome automatico do WhatsApp)
alter table conversations add column if not exists customer_name_confirmed boolean not null default false;
