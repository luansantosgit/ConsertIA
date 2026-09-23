-- Enable realtime on messages table so incoming webhook messages appear in chat
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
