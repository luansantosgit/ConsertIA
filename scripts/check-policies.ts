import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPolicies() {
  // Query pg_policies to see all policies on connections table
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'connections'`
  });
  
  if (error) {
    // Try direct query via information_schema
    console.log('RPC failed, trying raw query...');
    const result = await supabase.from('pg_policies').select('*').eq('tablename', 'connections');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPolicies();
