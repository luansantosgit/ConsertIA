-- Midia do chat: o WhatsApp aceita documentos de ate 100 MB.
-- O bucket estava limitado a 50 MB, o que impedia enviar videos grandes
-- como arquivo/documento (fallback de midia acima do limite do tipo).
update storage.buckets
set file_size_limit = 104857600
where id = 'chat-media';
