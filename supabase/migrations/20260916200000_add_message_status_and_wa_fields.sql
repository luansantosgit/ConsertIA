alter table messages add column if not exists status text default 'sent';
alter table messages add column if not exists wa_message_id text;
alter table messages add column if not exists wa_chat_id text;
alter table messages add column if not exists reaction text;
alter table messages add column if not exists edited boolean default false;
alter table messages add column if not exists deleted boolean default false;
alter table messages add column if not exists reply_to text;

create index if not exists idx_messages_wa_message_id on messages(wa_message_id);
create index if not exists idx_messages_wa_chat_id on messages(wa_chat_id);
