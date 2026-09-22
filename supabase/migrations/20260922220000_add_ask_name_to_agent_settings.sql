-- Agente de IA: opção de perguntar o nome do lead na primeira interação
alter table ai_agent_settings add column if not exists ask_name_enabled boolean not null default false;
