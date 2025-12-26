-- Migration: Create exec_sql function for dynamic SQL execution
-- This function allows the backend to create dynamic tables for CSV uploads
-- Run this in the Supabase SQL Editor

-- Create the function
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Revoke public access - only service role should use this
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;

-- Grant to service role (automatically has access via SECURITY DEFINER)
COMMENT ON FUNCTION public.exec_sql(text) IS 'Execute dynamic SQL for CSV table creation. Only accessible via service role key.';
