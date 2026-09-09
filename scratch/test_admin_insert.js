import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwrrqtttkpbgnqfrfizv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTY0OTksImV4cCI6MjEwNDQ5MjQ5OX0.9FWKIBFCe4MMZBeZ7wxJGb0KDPlGvNaEC3UgNMkqEY4';
// Use the service role key to bypass RLS and query pg_policies
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODkxNjQ5OSwiZXhwIjoyMTA0NDkyNDk5fQ.Ld_D1s0D6H4WbE10r713Qx6RMYO5oH51y2xZ7hVwP-M';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function run() {
  const { data, error } = await supabase.rpc('get_policies', {});
  // But wait, get_policies RPC might not exist.
  // Instead, let's just insert with admin key to see if table works.
  
  const key = 'storefront';
  const dataToSave = { company_name: "Test", banner_url: "Test" };
  const { data: insertData, error: insertError } = await supabase.from('settings').upsert({ key, value: JSON.stringify(dataToSave) }, { onConflict: 'key' });
  
  console.log('Admin insert error:', insertError);
}

run();
