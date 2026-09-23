-- Termos de serviço da OS configuraveis por empresa
alter table tenant_settings add column if not exists os_terms text;
