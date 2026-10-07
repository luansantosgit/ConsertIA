-- Permite sender_type 'reminder' nas mensagens (lembretes automáticos
-- do chat enviados pelo worker). Sem isso, o INSERT falha silenciosamente.
DO $$ begin
  alter table messages drop constraint if exists messages_sender_type_check;
exception when others then null; end $$;

DO $$ begin
  alter table messages add constraint messages_sender_type_check
    check (sender_type in ('customer','ai','attendant','reminder'));
exception when duplicate_object then null; end $$;
