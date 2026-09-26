-- Controle de exibicao dos planos no site institucional (deeperia.com.br)
-- + registro do plano de interesse no lead.

-- Planos marcados pelo superadmin aparecem no site COM o preco.
-- Planos nao marcados aparecem SEM preco (botao "Consultar valor").
alter table plans add column if not exists show_on_site boolean not null default false;

-- Plano escolhido pelo lead no site (funil no superadmin).
alter table landing_leads add column if not exists plan_name text;
