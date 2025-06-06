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
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

		console.log(today);

    // Fetch user ID by email
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log(userData);

    if (userError || !userData) {
      throw new Error(`Failed to fetch user: ${userError?.message || "User not found"}`);
    }

    const userId = userData.id;

		console.log(userId);

    // Check if a health metric was added today
    const { data: metricData, error: metricError } = await supabaseClient
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)

    if (metricError) {
      return new Response(JSON.stringify({ addedToday: false }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ addedToday: !!metricData[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in checkHealthMetricToday function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 