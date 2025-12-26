-- =====================================================
-- Migration: Create csv_uploads table for Phase 5
-- Purpose: Store metadata for uploaded CSV files
-- Applied: 2024-12-24
-- =====================================================

-- 1. Create csv_uploads table
CREATE TABLE IF NOT EXISTS csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  table_name TEXT NOT NULL UNIQUE,
  row_count INTEGER DEFAULT 0,
  column_count INTEGER DEFAULT 0,
  columns JSONB DEFAULT '[]',
  file_size_bytes INTEGER DEFAULT 0,
  encoding TEXT DEFAULT 'UTF-8',
  delimiter TEXT DEFAULT ',',
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error', 'expired')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_uploads_org_id ON csv_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_user_id ON csv_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_status ON csv_uploads(status);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_expires_at ON csv_uploads(expires_at);

-- 3. Enable RLS
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy for organization isolation
DROP POLICY IF EXISTS org_access_csv_uploads ON csv_uploads;
CREATE POLICY org_access_csv_uploads ON csv_uploads
  FOR ALL
  USING (org_id = (auth.jwt()->>'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt()->>'org_id')::uuid);

-- 5. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_csv_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS csv_uploads_updated_at ON csv_uploads;
CREATE TRIGGER csv_uploads_updated_at
  BEFORE UPDATE ON csv_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_csv_uploads_updated_at();
