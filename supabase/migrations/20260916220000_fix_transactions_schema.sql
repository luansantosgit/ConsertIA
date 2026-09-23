-- Add missing enum values to tx_type
DO $$ BEGIN
  alter type tx_type add value if not exists 'refund';
exception when duplicate_object then null; end $$;

-- Add missing enum values to tx_status (keep existing paid/pending/overdue)
DO $$ BEGIN
  alter type tx_status add value if not exists 'completed';
exception when duplicate_object then null; end $$;

DO $$ BEGIN
  alter type tx_status add value if not exists 'cancelled';
exception when duplicate_object then null; end $$;

-- Add missing columns to transactions
alter table transactions add column if not exists service_order_id uuid;
alter table transactions add column if not exists payment_method text;
alter table transactions add column if not exists updated_at timestamptz;
