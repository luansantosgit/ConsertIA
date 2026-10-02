-- Respostas de sistema (endereço/horário) passam a ser DINÂMICAS:
-- consumidas ao vivo do tenant_settings, sem registro em quick_replies.
delete from quick_replies
where is_default = true and shortcut in ('endereco', 'horario');
