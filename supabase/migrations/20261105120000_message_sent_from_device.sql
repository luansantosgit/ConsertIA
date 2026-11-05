-- ============================================================
-- Echo: mensagem enviada PELO APARELHO (issue #105)
--
-- O webhook da Uazapi ignorava toda mensagem com fromMe=true.
-- Mensagens enviadas pela API (wasSentByApi=true) já são gravadas
-- pelo sistema, mas as respondidas no CELULAR não apareciam no chat.
--
-- sent_from_device = true marca a mensagem enviada pelo aparelho
-- (o chat mostra o rótulo "Enviado pelo aparelho").
-- ============================================================

alter table messages add column if not exists sent_from_device boolean not null default false;

-- Permite o runtime filtrar as mensagens do aparelho sem varrer a tabela
create index if not exists idx_messages_sent_from_device
  on messages(tenant_id, conversation_id)
  where sent_from_device = true;
