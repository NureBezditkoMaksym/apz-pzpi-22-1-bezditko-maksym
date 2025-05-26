import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TableInfo {
  name: string;
  data: any[];
}

serve(async (req) => {
  try {
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

    // First, get a list of all tables in the public schema
    const { data: tables, error: tablesError } = await supabaseClient
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .not("table_name", "like", "pg_%")
      .not("table_name", "like", "schema_%");

    if (tablesError) {
      throw new Error(`Error fetching tables: ${tablesError.message}`);
    }

    // Extract all data from each table
    const exportData: Record<string, TableInfo> = {};

    for (const table of tables) {
      const tableName = table.table_name;

      const { data: tableData, error: tableDataError } = await supabaseClient
        .from(tableName)
        .select("*");

      if (tableDataError) {
        console.error(
          `Error fetching data from ${tableName}: ${tableDataError.message}`
        );
        continue;
      }

      exportData[tableName] = {
        name: tableName,
        data: tableData || [],
      };
    }

    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `database_export_${timestamp}.json`;

    // Prepare response with the JSON data
    const jsonData = JSON.stringify(exportData, null, 2);

    return new Response(jsonData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error("Export error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
