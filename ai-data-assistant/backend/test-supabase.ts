import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrasngxoosnofrefzghj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyYXNuZ3hvb3Nub2ZyZWZ6Z2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzM1NzEsImV4cCI6MjA3NDIwOTU3MX0.Yb_S9QXROvIyEBGOhG1tn65Wnsga_6L2H7Nsp4JYaYE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      console.log('Trying to get tables using pg_tables...');
      
      // Try alternative approach
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      if (tablesError) {
        console.log('Tables error:', tablesError.message);
      } else {
        console.log('Tables found:', tables);
      }
    } else {
      console.log('Connection successful! Data:', data);
    }
  } catch (err: any) {
    console.log('Exception:', err.message);
  }
}

testConnection();