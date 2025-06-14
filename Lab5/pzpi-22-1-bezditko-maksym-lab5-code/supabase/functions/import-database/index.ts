// @ts-ignore: Import from URL
import { createClient } from "jsr:@supabase/supabase-js@2";

interface TableData {
  content: any[];
}

interface ImportData {
  [tableName: string]: TableData;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helpers for AES-GCM decryption
function decodeBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function decodeUTF8(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

async function decryptData(
  encryptedPayload: {
    iv: string;
    salt: string;
    data: string;
  },
  password: string
): Promise<ImportData> {
  const { iv, salt, data } = encryptedPayload;

  const ivBytes = decodeBase64(iv);
  const saltBytes = decodeBase64(salt);
  const encryptedBytes = decodeBase64(data);
  const passwordBytes = new TextEncoder().encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    aesKey,
    encryptedBytes
  );

  const decryptedText = decodeUTF8(new Uint8Array(decryptedBuffer));
  return JSON.parse(decryptedText);
}

// Deno API for Supabase Edge Functions
// @ts-ignore: Deno namespace will be available in Supabase Edge Functions environment
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and decrypt uploaded data
    let importData: ImportData;

    try {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Support direct raw JSON (unencrypted)
        const body = await req.json();
        if (body.password && body.data) {
          // Handle encrypted data with password
          importData = await decryptData(body.data, body.password);
        } else {
          // Handle plain JSON data
          importData = body;
        }
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("file");
        const password = formData.get("password") as string;

        if (!file || !(file instanceof File)) {
          throw new Error("No valid file uploaded");
        }

        if (!password) {
          throw new Error("Password is required for encrypted files");
        }

        const fileContent = await file.text();

        try {
          // Try to parse as encrypted payload first
          const encryptedPayload = JSON.parse(fileContent);
          importData = await decryptData(encryptedPayload, password);
        } catch (maybeEncryptedError) {
          try {
            // Fallback to plain JSON
            importData = JSON.parse(fileContent);
          } catch (finalError) {
            throw new Error("Invalid file format: " + finalError.message);
          }
        }
      } else {
        throw new Error("Unsupported content type. Please upload a JSON file.");
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse import data: " + error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const IMPORT_ORDER = [
      "subscriptions",
      "health_metrics",
      "reports",
      "notifications",
    ];

    const results: Record<
      string,
      { success: boolean; message: string; count?: number }
    > = {};

    try {
      await supabaseClient.rpc("exec_sql", {
        query: "SET session_replication_role = 'replica';",
      });
    } catch (error) {
      console.warn("Could not disable foreign key checks:", error.message);
    }

    console.log(importData);

    for (const tableName of IMPORT_ORDER) {
      if (!importData[tableName]) {
        results[tableName] = {
          success: true,
          message: "Table not found in import data",
          count: 0,
        };
        continue;
      }

      const tableData = importData[tableName].content;

      if (!tableData || !Array.isArray(tableData) || !tableData.length) {
        results[tableName] = {
          success: true,
          message: "No data to import",
          count: 0,
        };
        continue;
      }

      try {
        const { error: insertError } = await supabaseClient
          .from(tableName)
          .insert(tableData);

        if (tableName === "users") {
          for (const user of tableData) {
            await supabaseClient.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              phone: user.phone,
              user_metadata: {
                username: user.username,
                is_premium: user.is_premium ?? false,
              },
            });
          }
        }

        if (insertError) {
          results[tableName] = {
            success: false,
            message: `Error importing to ${tableName}: ${insertError.message}`,
          };
        } else {
          results[tableName] = {
            success: true,
            message: "Import successful",
            count: tableData.length,
          };
        }
      } catch (error) {
        results[tableName] = {
          success: false,
          message: `Exception importing to ${tableName}: ${error.message}`,
        };
      }
    }

    try {
      await supabaseClient.rpc("exec_sql", {
        query: "SET session_replication_role = 'origin';",
      });
    } catch (error) {
      console.warn("Could not re-enable foreign key checks:", error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database import completed",
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Import error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
