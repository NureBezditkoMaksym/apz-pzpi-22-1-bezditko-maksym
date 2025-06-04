/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GET_ALL_FUNCTIONS = [
  "get-all-health-metrics",
  "get-all-subscriptions",
  "get-all-notifications",
  "get-all-reports",
];

const TABLE_NAMES = [
  "health_metrics",
  "subscriptions",
  "notifications",
  "reports",
];

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function encryptData(data: any, password: string): Promise<string> {
  const jsonData = JSON.stringify(data);
  const encodedPassword = encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encodedPassword,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encode(jsonData)
  );

  return JSON.stringify({
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    data: arrayBufferToBase64(encrypted),
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a Supabase client with the Auth context of the logged in user
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    const { password, userId } = await req.json();

    // Validate password is provided
    if (!password) {
      return new Response(JSON.stringify({ error: "Password is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Supabase URL for function calls
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    // Export all tables by calling existing get-all functions
    const exportData: Record<string, { content: any[] }> = {};

    for (let i = 0; i < GET_ALL_FUNCTIONS.length; i++) {
      const functionName = GET_ALL_FUNCTIONS[i];
      const tableName = TABLE_NAMES[i];

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/${functionName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authorization,
            },
          }
        );

        if (!response.ok) {
          console.error(`Error calling ${functionName}:`, response.statusText);
          exportData[tableName] = { content: [] };
          continue;
        }

        const data = await response.json();
        exportData[tableName] = { content: data };
      } catch (error) {
        console.error(`Error calling ${functionName}:`, error);
        exportData[tableName] = { content: [] };
      }
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get(
              "SUPABASE_SERVICE_ROLE_KEY"
            )}`,
          },
        },
      }
    );

    // Use the provided password for encryption instead of environment variable
    const encryptedExport = await encryptData(exportData, password);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `database-export-${timestamp}.encrypted.json`;

    // Convert encrypted data to base64 for JSON response
    const base64Data = btoa(encryptedExport);

    await supabaseClient
      .from("health_metrics")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient
      .from("subscriptions")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient
      .from("notifications")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient
      .from("reports")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000");

    // Return the encrypted export data as JSON with base64 content
    return new Response(
      JSON.stringify({
        filename,
        fileContent: base64Data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
