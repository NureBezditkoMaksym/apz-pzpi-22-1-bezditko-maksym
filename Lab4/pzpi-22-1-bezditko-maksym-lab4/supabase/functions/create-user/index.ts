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
    if (!req.body) {
      throw new Error("Request body is empty");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        },
      }
    );

    const { username, email, is_premium, phone, password } = await req.json();

    if (!phone || !username || !email || typeof is_premium !== "boolean" || !password) {
      throw new Error("Phone number, username, email, password and is_premium are required");
    }

    const { error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      email_confirm: true,
      phone,
      password,
      user_metadata: {
        username,
        is_premium: is_premium ?? false,
      },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    return new Response(
      JSON.stringify({ message: "User created successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});