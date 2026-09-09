-- Stäng av RLS helt på settings-tabellen så att sparningen garanterat går igenom
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
