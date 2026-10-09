-- bump_conversation: permite importar histórico sem incrementar não-lidas.
-- Mensagens antigas sincronizadas (history-sync Uazapi) não devem
-- marcar a conversa como não lida — só atualizam o preview se mais recentes.
drop function if exists bump_conversation(uuid, timestamptz, text);
drop function if exists bump_conversation(uuid, timestamptz, text, boolean);

create or replace function bump_conversation(
  p_conv_id uuid,
  p_last_at timestamptz,
  p_last_message text,
  p_count_unread boolean default true
) returns void
language sql
as $fn$
  update conversations
  set
    unread_count = case when p_count_unread then unread_count + 1 else unread_count end,
    last_message = coalesce(
      case when last_message_at is null or last_message_at < p_last_at then p_last_message end,
      last_message
    ),
    last_message_at = coalesce(
      case when last_message_at is null or last_message_at < p_last_at then p_last_at end,
      last_message_at
    )
  where id = p_conv_id;
$fn$;

-- Apenas o service role (edge functions) pode chamar (assinatura explícita)
revoke execute on function bump_conversation(uuid, timestamptz, text, boolean) from public, anon, authenticated;
