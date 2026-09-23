-- Função atômica: incrementa não lidas + atualiza last_message apenas se mais recente
-- Substitui 3 queries do webhook por 1, sem corrida de concorrência.
create or replace function bump_conversation(
  p_conv_id uuid,
  p_last_at timestamptz,
  p_last_message text
) returns void
language sql
as $fn$
  update conversations
  set
    unread_count = unread_count + 1,
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

-- Apenas o service role (edge functions) pode chamar
revoke execute on function bump_conversation from public, anon, authenticated;
