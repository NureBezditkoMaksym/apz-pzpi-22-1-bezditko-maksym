import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

// Supabase configuration
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export types for convenience
export type { User, Session, AuthError } from "@supabase/supabase-js";
export type { Database } from "../types/supabase";
