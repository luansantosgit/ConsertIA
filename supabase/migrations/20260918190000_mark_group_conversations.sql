-- Marca conversas de grupo existentes (@g.us) e preenche remote_jid retroativamente
update conversations
set is_group = true,
    remote_jid = coalesce(remote_jid, contact_phone)
where contact_phone like '%@g.us'
   or remote_jid like '%@g.us';
