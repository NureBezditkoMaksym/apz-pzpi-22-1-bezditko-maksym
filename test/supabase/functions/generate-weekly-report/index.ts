import { createClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthMetric {
  calories: number;
  water_ml: number;
  steps: number;
  date: string;
}

interface WeeklyReport {
  start_date: string;
  end_date: string;
  metrics: {
    calories: {
      average: number;
      highest: number;
      lowest: number;
      total: number;
    };
    water_ml: {
      average: number;
      highest: number;
      lowest: number;
      total: number;
    };
    steps: {
      average: number;
      highest: number;
      lowest: number;
      total: number;
    };
  };
  progress: {
    caloriesProgress: number;     // % change from previous week
    waterProgress: number;        // % change from previous week
    stepsProgress: number;        // % change from previous week
  };
  days_tracked: number;          // number of days with data
}

function calculateMetricStats(metrics: number[]) {
  const validMetrics = metrics.filter(m => m !== null && !isNaN(m));
  if (validMetrics.length === 0) return { average: 0, highest: 0, lowest: 0, total: 0 };
  
  return {
    average: Math.round(validMetrics.reduce((a, b) => a + b, 0) / validMetrics.length),
    highest: Math.max(...validMetrics),
    lowest: Math.min(...validMetrics),
    total: validMetrics.reduce((a, b) => a + b, 0)
  };
}

function calculateProgress(currentWeekTotal: number, previousWeekTotal: number): number {
  if (previousWeekTotal === 0) return 0;
  return Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate date ranges
    const endDateTime = new Date(endDate);
    const startDateTime = new Date(endDateTime);
    startDateTime.setDate(startDateTime.getDate() - 6); // Get 7 days of data

    const previousEndDateTime = new Date(startDateTime);
    previousEndDateTime.setDate(previousEndDateTime.getDate() - 1);
    const previousStartDateTime = new Date(previousEndDateTime);
    previousStartDateTime.setDate(previousStartDateTime.getDate() - 6);

    // Fetch current week's metrics
    const { data: currentWeekData, error: currentWeekError } = await supabaseClient
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateTime.toISOString().split('T')[0])
      .lte('date', endDateTime.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (currentWeekError) throw new Error(`Failed to fetch current week metrics: ${currentWeekError.message}`);

    // Fetch previous week's metrics for progress comparison
    const { data: previousWeekData, error: previousWeekError } = await supabaseClient
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', previousStartDateTime.toISOString().split('T')[0])
      .lte('date', previousEndDateTime.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (previousWeekError) throw new Error(`Failed to fetch previous week metrics: ${previousWeekError.message}`);

    // Process current week's data
    const currentWeekMetrics = currentWeekData as HealthMetric[];
    const previousWeekMetrics = previousWeekData as HealthMetric[];

    const caloriesStats = calculateMetricStats(currentWeekMetrics.map(m => m.calories));
    const waterStats = calculateMetricStats(currentWeekMetrics.map(m => m.water_ml));
    const stepsStats = calculateMetricStats(currentWeekMetrics.map(m => m.steps));

    const report: WeeklyReport = {
      start_date: startDateTime.toISOString().split('T')[0],
      end_date: endDateTime.toISOString().split('T')[0],
      metrics: {
        calories: caloriesStats,
        water_ml: waterStats,
        steps: stepsStats,
      },
      progress: {
        caloriesProgress: calculateProgress(
          caloriesStats.total,
          calculateMetricStats(previousWeekMetrics.map(m => m.calories)).total
        ),
        waterProgress: calculateProgress(
          waterStats.total,
          calculateMetricStats(previousWeekMetrics.map(m => m.water_ml)).total
        ),
        stepsProgress: calculateProgress(
          stepsStats.total,
          calculateMetricStats(previousWeekMetrics.map(m => m.steps)).total
        ),
      },
      days_tracked: currentWeekMetrics.length,
    };

    // Store the report in the database
    const { error: insertError } = await supabaseClient
      .from('reports')
      .insert([{
        user_id: userId,
        report_date: endDate,
        report_data: report,
      }]);

    if (insertError) throw new Error(`Failed to store report: ${insertError.message}`);

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in generateWeeklyReport function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 