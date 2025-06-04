import { createClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const metricId = url.searchParams.get('id');

    if (!metricId) {
      return new Response(JSON.stringify({ error: "Metric ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseClient.from('health_metrics').select('*').eq('metric_id', metricId).single();

    if (error) {
      throw new Error(`Failed to fetch health metric: ${error.message}`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in getHealthMetric function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 