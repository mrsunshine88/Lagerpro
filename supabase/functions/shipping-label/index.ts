import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Init Supabase client with Service Role to bypass RLS for generating labels
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // 1. Fetch booking
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch shipping config (mocked as PostNord for now since old logic just checked provider)
    // The old logic fetched settings, we can do that too if needed, but for now we mock the API.
    const provider = 'POSTNORD';
    const trackingNumber = `${provider}-${Math.floor(Math.random() * 1000000000)}`;
    const labelUrl = `https://example.com/labels/${trackingNumber}.pdf`;

    // 3. Update booking with tracking info and status 'confirmed'
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ 
        tracking_number: trackingNumber,
        shipping_label_url: labelUrl,
        status: 'confirmed'
      })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ trackingNumber, labelUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
