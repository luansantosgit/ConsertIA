-- Formas de pagamento EXCLUSIVAS do wizard de cadastro rápido
-- (/comece-agora), definidas pelo superadmin de forma separada da
-- assinatura normal. NULL/empty = usa as formas globais.
alter table asaas_config add column if not exists onboarding_enabled_methods text[];
