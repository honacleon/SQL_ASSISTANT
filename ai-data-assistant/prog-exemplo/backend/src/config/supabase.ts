import { createClient } from '@supabase/supabase-js';
import { DatabaseConfig } from '@ai-data-assistant/shared';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const databaseConfig: DatabaseConfig = {
  url: supabaseUrl,
  key: supabaseServiceKey,
  schema: 'public'
};