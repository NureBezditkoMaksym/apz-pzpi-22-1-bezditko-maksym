import { createClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_email, calories, water_ml, steps, photo_url } =
      await req.json();

    if (!user_email) {
      return new Response(JSON.stringify({ error: "User email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Fetch user ID by email
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("id")
      .eq("email", user_email)
      .single();

    if (userError || !userData) {
      throw new Error(
        `Failed to fetch user: ${userError?.message || "User not found"}`
      );
    }

    const userId = userData.id;

    // Check if a health metric already exists for today
    const { data: existingMetric, error: checkError } = await supabaseClient
      .from("health_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    let data, error;

    if (existingMetric && !checkError) {
      // Update existing record by adding new values to current ones
      const updatedData = {
        calories: (existingMetric.calories || 0) + (calories || 0),
        water_ml: (existingMetric.water_ml || 0) + (water_ml || 0),
        steps: (existingMetric.steps || 0) + (steps || 0),
        photo_url: photo_url || existingMetric.photo_url, // Use new photo if provided, otherwise keep existing
      };

      const updateResult = await supabaseClient
        .from("health_metrics")
        .update(updatedData)
        .eq("metric_id", existingMetric.metric_id)
        .select()
        .single();

      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Create new record
      const insertResult = await supabaseClient
        .from("health_metrics")
        .insert([
          {
            user_id: userId,
            date: today,
            calories: calories || 0,
            water_ml: water_ml || 0,
            steps: steps || 0,
            photo_url,
          },
        ])
        .select()
        .single();

      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      throw new Error(`Failed to save health metric: ${error.message}`);
    }

    return new Response(JSON.stringify(data), {
      status: existingMetric ? 200 : 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in createHealthMetric function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
