-- Skapa bucket för bilder
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Tillåt alla att se bilderna
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );

-- Tillåt inloggad personal att ladda upp bilder
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'images' );

-- Tillåt inloggad personal att uppdatera befintliga bilder
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'images' );
