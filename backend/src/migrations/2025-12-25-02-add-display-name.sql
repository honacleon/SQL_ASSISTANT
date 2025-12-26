-- Migration: Add display_name column to csv_uploads
-- This allows users to set a custom name for their uploaded tables

-- Add the display_name column
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Set default value for existing rows (use original_filename as fallback)
UPDATE csv_uploads SET display_name = original_filename WHERE display_name IS NULL;

-- Add comment
COMMENT ON COLUMN csv_uploads.display_name IS 'User-friendly name for the uploaded table';
