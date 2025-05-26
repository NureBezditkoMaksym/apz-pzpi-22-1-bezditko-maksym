import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TableInfo {
  name: string;
  data: any[];
}

interface ImportData {
  [tableName: string]: TableInfo;
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the uploaded JSON file
    let importData: ImportData;
    try {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Direct JSON data
        importData = await req.json();
      } else if (contentType.includes("multipart/form-data")) {
        // Form upload
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
          throw new Error("No valid file uploaded");
        }

        const fileContent = await file.text();
        importData = JSON.parse(fileContent);
      } else {
        throw new Error("Unsupported content type. Please upload a JSON file.");
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON data: " + error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client
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

    // Process each table in the import data
    const results: Record<
      string,
      { success: boolean; message: string; count?: number }
    > = {};

    // First, clear all existing data
    // Get a list of tables
    const { data: tables, error: tablesError } = await supabaseClient
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .not("table_name", "like", "pg_%")
      .not("table_name", "like", "schema_%");

    if (tablesError) {
      throw new Error(`Error fetching tables: ${tablesError.message}`);
    }

    // Disable foreign key checks temporarily (if possible in Supabase)
    await supabaseClient.rpc("set_config", {
      parameter: "session.force_foreign_key_checks",
      value: "false",
    });

    // Clear existing data in reverse order to handle foreign key constraints
    for (const table of [...tables].reverse()) {
      const tableName = table.table_name;
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .neq("id", 0); // Delete all rows

      if (deleteError) {
        results[tableName] = {
          success: false,
          message: `Error clearing table ${tableName}: ${deleteError.message}`,
        };
      }
    }

    // Re-enable foreign key checks
    await supabaseClient.rpc("set_config", {
      parameter: "session.force_foreign_key_checks",
      value: "true",
    });

    // Now import the data in the correct order
    for (const tableName in importData) {
      const tableInfo = importData[tableName];
      const tableData = tableInfo.data;

      if (!tableData || !tableData.length) {
        results[tableName] = {
          success: true,
          message: "No data to import",
          count: 0,
        };
        continue;
      }

      try {
        // Insert all rows
        const { error: insertError } = await supabaseClient
          .from(tableName)
          .insert(tableData);

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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database import completed",
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Import error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
