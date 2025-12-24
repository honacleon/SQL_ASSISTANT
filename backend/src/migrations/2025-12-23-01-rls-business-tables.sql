-- =====================================================
-- Migration: Add org_id and RLS to business tables
-- Purpose: Enable multi-tenant isolation for customers, orders, order_items
-- Applied: 2024-12-23
-- =====================================================

-- 1. Create default organization for existing data (if doesn't exist)
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization')
ON CONFLICT (id) DO NOTHING;

-- 2. Add org_id column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 3. Add org_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 4. Add org_id column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 5. Update existing data with default organization
UPDATE customers SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE orders SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE order_items SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- 6. Make org_id NOT NULL after populating existing data
ALTER TABLE customers ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN org_id SET NOT NULL;

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON order_items(org_id);

-- 8. Enable RLS on all business tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for customers
DROP POLICY IF EXISTS org_access_customers ON customers;
CREATE POLICY org_access_customers ON customers
  FOR ALL
  USING (org_id = (auth.jwt()->>'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt()->>'org_id')::uuid);

-- 10. Create RLS policies for orders
DROP POLICY IF EXISTS org_access_orders ON orders;
CREATE POLICY org_access_orders ON orders
  FOR ALL
  USING (org_id = (auth.jwt()->>'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt()->>'org_id')::uuid);

-- 11. Create RLS policies for order_items
DROP POLICY IF EXISTS org_access_order_items ON order_items;
CREATE POLICY org_access_order_items ON order_items
  FOR ALL
  USING (org_id = (auth.jwt()->>'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt()->>'org_id')::uuid);
