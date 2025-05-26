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
    const { user_id, report_date, report_data } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseClient.from('reports').insert([
      { user_id, report_date, report_data }
    ]).select().single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in createReport function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 