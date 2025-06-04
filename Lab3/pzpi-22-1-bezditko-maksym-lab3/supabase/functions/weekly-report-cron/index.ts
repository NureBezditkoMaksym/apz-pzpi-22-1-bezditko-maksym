import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  try {
    const authorization = req.headers.get("authorization");

    console.log(Deno.env.get("CRON_SECRET"));

    if (authorization !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
      throw new Error("Unauthorized");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize Denomailer SMTPClient
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("EMAIL_HOST") ?? "",
        port: parseInt(Deno.env.get("EMAIL_PORT") ?? "465"),
        tls: true,
        auth: {
          username: Deno.env.get("EMAIL_USERNAME") ?? "",
          password: Deno.env.get("EMAIL_PASSWORD") ?? "",
        },
      },
    });

    console.log(
      Deno.env.get("EMAIL_USERNAME") ?? "",
      Deno.env.get("EMAIL_PASSWORD") ?? ""
    );

    // Get all users
    const { data: users, error: usersError } = await supabaseClient
      .from("users")
      .select("*");

    if (usersError)
      throw new Error(`Failed to fetch users: ${usersError.message}`);

    const results = [];
    const errors = [];

    // Generate report for each user
    for (const user of users) {
      try {
        // Generate report
        const reportResponse = await fetch(
          `${Deno.env.get(
            "SUPABASE_URL"
          )}/functions/v1/generate-weekly-report?userId=${user.auth_id}`,
          {
            headers: {
              Authorization: `Bearer ${Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
              )}`,
            },
          }
        );

        if (!reportResponse.ok) {
          throw new Error(`Failed to generate report for user ${user.auth_id}`);
        }

        const report = await reportResponse.json();

        // Format email message
        const message = `
  <h2>Weekly Health Report</h2>
  <p><strong>Period:</strong> ${report.start_date} to ${report.end_date}</p>
  <h3>Summary:</h3>
  <ul>
    <li><strong>Steps:</strong> ${report.metrics.steps.average}/day</li>
    <li><strong>Calories:</strong> ${report.metrics.calories.average}/day</li>
    <li><strong>Water:</strong> ${report.metrics.water_ml.average}ml/day</li>
    <li><strong>Days Tracked:</strong> ${report.days_tracked}</li>
  </ul>
`.trim();

        console.log(user.email);

        // Send email if email exists
        if (user.email) {
          await client.send({
            from: Deno.env.get("EMAIL_USERNAME") ?? "",
            to: user.email,
            subject: "Weekly Health Report",
            content: "Your weekly health report is ready.",
            html: message,
          });

          console.log(`Email sent to ${user.email}`);
        }

        results.push({
          userId: user.auth_id,
          success: true,
          reportGenerated: true,
          emailSent: !!user.email,
        });
      } catch (error) {
        console.error(`Error processing user ${user.auth_id}:`, error);

        errors.push({
          userId: user.auth_id,
          error: error.message,
        });
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in weekly-report-cron:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
