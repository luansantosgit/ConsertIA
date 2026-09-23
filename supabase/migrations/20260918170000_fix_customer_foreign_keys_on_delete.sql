-- Fix foreign key constraints on conversations and leads to ON DELETE SET NULL
-- so customers can be deleted without foreign key conflicts.

DO $$
BEGIN
  -- Conversations foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversations_customer_id_fkey' AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_customer_id_fkey;
  END IF;

  ALTER TABLE conversations
    ADD CONSTRAINT conversations_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

  -- Leads foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_customer_id_fkey' AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_customer_id_fkey;
  END IF;

  ALTER TABLE leads
    ADD CONSTRAINT leads_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
END $$;
