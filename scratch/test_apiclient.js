import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwrrqtttkpbgnqfrfizv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTY0OTksImV4cCI6MjEwNDQ5MjQ5OX0.9FWKIBFCe4MMZBeZ7wxJGb0KDPlGvNaEC3UgNMkqEY4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'apersson508@gmail.com',
    password: '020406'
  });
  
  // Simulate the exact apiClient.ts logic
  const path = '/api/users/profile';
  
  if (path.includes('/api/users/profile')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session in apiClient');
      return { data: null };
    }
    const { data, error } = await supabase.from('users').select('*').eq('email', session.user.email).maybeSingle();
    console.log('Returned from apiClient:', data);
  }
}

run();
