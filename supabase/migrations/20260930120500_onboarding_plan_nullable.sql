-- Onboarding: plano é escolhido APÓS os dados (ordem 1,2,3,4 do wizard)
alter table onboarding_sessions alter column plan_id drop not null;
