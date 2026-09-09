-- Enable Row Level Security on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products, variants and settings (for storefront)
CREATE POLICY "Public profiles are viewable by everyone." ON products FOR SELECT USING (true);
CREATE POLICY "Public variants are viewable by everyone." ON variants FOR SELECT USING (true);
CREATE POLICY "Public settings are viewable by everyone." ON settings FOR SELECT USING (true);

-- Allow public insert to bookings (customers placing orders)
CREATE POLICY "Public can insert bookings" ON bookings FOR INSERT WITH CHECK (true);

-- Admin full access to everything
CREATE POLICY "Admins have full access to products" ON products FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to variants" ON variants FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to bookings" ON bookings FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to transactions" ON transactions FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to settings" ON settings FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to discount_codes" ON discount_codes FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins have full access to users" ON users FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
