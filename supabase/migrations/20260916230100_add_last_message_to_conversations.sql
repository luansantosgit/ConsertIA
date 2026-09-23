-- Add last_message column to conversations for sidebar preview
alter table conversations add column if not exists last_message text;
