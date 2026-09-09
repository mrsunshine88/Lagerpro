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
    const payload = await req.json();

    // Init Supabase client with Service Role to bypass RLS for incoming webhooks
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // This webhook handles incoming PayPal events
    if (payload.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const resource = payload.resource;
      const orderId = resource.id;
      
      // Update transaction status in database
      // Since it's a generic example, we update the transaction based on orderId
      // assuming we saved paypal_order_id in transactions.
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: 'completed' })
        .eq('paypal_order_id', orderId);
        
      if (error) console.error("Error updating transaction:", error);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
