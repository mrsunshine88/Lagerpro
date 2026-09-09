-- Ta först bort tabellerna från publikationen (ignorerar fel om de inte finns där)
BEGIN;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.variants;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.products;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.transactions;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.bookings;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.settings;
COMMIT;

-- Lägg sedan till dem igen på ett rent sätt
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.variants;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
COMMIT;
