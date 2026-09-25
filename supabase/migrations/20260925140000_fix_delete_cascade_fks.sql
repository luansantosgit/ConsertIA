-- Corrige exclusão de cliente em cascata (Issue #28)
-- calendar_events e stock_movements travavam o DELETE de service_orders (FK sem ON DELETE).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_os_id_fkey' AND table_name = 'calendar_events'
  ) THEN
    ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_os_id_fkey;
  END IF;

  ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_os_id_fkey
    FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_os_id_fkey' AND table_name = 'stock_movements'
  ) THEN
    ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_os_id_fkey;
  END IF;

  ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_os_id_fkey
    FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'service_orders_equipment_id_fkey' AND table_name = 'service_orders'
  ) THEN
    ALTER TABLE service_orders DROP CONSTRAINT service_orders_equipment_id_fkey;
  END IF;

  ALTER TABLE service_orders
    ADD CONSTRAINT service_orders_equipment_id_fkey
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;
END $$;
