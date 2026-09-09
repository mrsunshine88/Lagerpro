-- ==========================================
-- FIXA ALLA RLS-REGLER FÖR HELA SYSTEMET
-- ==========================================

-- 1. Produkter
DROP POLICY IF EXISTS "Admins can do everything on products" ON public.products;
CREATE POLICY "Staff kan lägga in produkter" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera produkter" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera produkter" ON public.products FOR DELETE TO authenticated USING (true);

-- 2. Varianter (Skor/Storlekar)
DROP POLICY IF EXISTS "Admins can do everything on variants" ON public.variants;
CREATE POLICY "Staff kan lägga in varianter" ON public.variants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera varianter" ON public.variants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera varianter" ON public.variants FOR DELETE TO authenticated USING (true);

-- 3. Rabattkoder
DROP POLICY IF EXISTS "Admins can do everything on discount_codes" ON public.discount_codes;
CREATE POLICY "Staff kan lägga in rabatter" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera rabatter" ON public.discount_codes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera rabatter" ON public.discount_codes FOR DELETE TO authenticated USING (true);

-- 4. Ordrar (Bookings)
DROP POLICY IF EXISTS "Admins can do everything on bookings" ON public.bookings;
CREATE POLICY "Staff kan lägga in ordrar" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera ordrar" ON public.bookings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera ordrar" ON public.bookings FOR DELETE TO authenticated USING (true);

-- 5. Transaktioner (Historik)
DROP POLICY IF EXISTS "Admins can do everything on transactions" ON public.transactions;
CREATE POLICY "Staff kan lägga in transaktioner" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera transaktioner" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera transaktioner" ON public.transactions FOR DELETE TO authenticated USING (true);

-- 6. Användare (Personal)
DROP POLICY IF EXISTS "Admins can do everything on users" ON public.users;
CREATE POLICY "Staff kan lägga in personal" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff kan uppdatera personal" ON public.users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff kan radera personal" ON public.users FOR DELETE TO authenticated USING (true);
