-- Ta bort gamla regeln
DROP POLICY IF EXISTS "Admins can do everything on settings" ON public.settings;

-- Lägg till ny regel för INSERT, UPDATE, DELETE separat
CREATE POLICY "Admins insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);

CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);

CREATE POLICY "Admins delete settings" ON public.settings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
