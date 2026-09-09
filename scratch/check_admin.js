import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwrrqtttkpbgnqfrfizv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTY0OTksImV4cCI6MjEwNDQ5MjQ5OX0.9FWKIBFCe4MMZBeZ7wxJGb0KDPlGvNaEC3UgNMkqEY4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('Error:', error);
  console.log('Users in DB:', data);
}

run();
