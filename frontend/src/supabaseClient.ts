import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cwrrqtttkpbgnqfrfizv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTY0OTksImV4cCI6MjEwNDQ5MjQ5OX0.9FWKIBFCe4MMZBeZ7wxJGb0KDPlGvNaEC3UgNMkqEY4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
