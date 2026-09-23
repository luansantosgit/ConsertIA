alter table platform_settings add column if not exists webhook_url text;

update platform_settings set webhook_url = 'https://sknimzjwpdbcuutxbycq.supabase.co/functions/v1/uazapi-webhook' where webhook_url is null;
