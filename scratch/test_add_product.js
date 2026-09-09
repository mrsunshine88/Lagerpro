import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwrrqtttkpbgnqfrfizv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cnJxdHR0a3BiZ25xZnJmaXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTY0OTksImV4cCI6MjEwNDQ5MjQ5OX0.9FWKIBFCe4MMZBeZ7wxJGb0KDPlGvNaEC3UgNMkqEY4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'apersson508@gmail.com',
    password: '020406'
  });
  
  console.log('Inserting product...');
  const payload = {
      name: "Testskor",
      category: "Skor",
      description: "",
      image_url: "",
      discount_percent: null,
      variant_label_1: "Storlek",
      variant_label_2: "Färg",
  };
  const { data: prod, error: pErr } = await supabase.from('products').insert(payload).select().single();
  console.log('Product error:', pErr);
  console.log('Product data:', prod);
  
  if (prod) {
    const vPayload = [
      { product_id: prod.id, size: '42', color: 'Vit', stock: 5, purchase_price: 100, selling_price: 200, sku: 'TEST-123' }
    ];
    const { data: vData, error: vErr } = await supabase.from('variants').insert(vPayload);
    console.log('Variant error:', vErr);
  }
}

run();
