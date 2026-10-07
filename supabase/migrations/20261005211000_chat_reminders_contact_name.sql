-- Nome do lead na tabela de lembretes (para exibir no card em vez de só telefone)
alter table chat_reminders add column if not exists contact_name text not null default '';
