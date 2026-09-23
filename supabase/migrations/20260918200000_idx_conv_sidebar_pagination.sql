-- Indice composto para a paginacao da sidebar de atendimento
-- (getForSidebar: order by pinned desc, last_message_at desc)
create index if not exists idx_conv_tenant_pinned_lastmsg
  on conversations(tenant_id, pinned desc, last_message_at desc);
