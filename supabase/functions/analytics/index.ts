import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default {
  async fetch(req: Request) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // Return basic structure so the frontend doesn't crash
      const dummyData = {
        is_lump_sum: true,
        total_sold_units: 0,
        stock_metrics: {
          total_cost: 0,
          potential_sales: 0,
          potential_profit: 0,
        },
        break_even: {
          total_investment: 0,
          total_revenue: 0,
          net_profit: 0,
        },
        financials: {
          today: { revenue: 0, cost: 0, profit: 0, margin: 0 },
          week: { revenue: 0, cost: 0, profit: 0, margin: 0 },
          month: { revenue: 0, cost: 0, profit: 0, margin: 0 }
        },
        recent_sales: [],
        project_summaries: []
      };

      return new Response(JSON.stringify(dummyData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  }
};
