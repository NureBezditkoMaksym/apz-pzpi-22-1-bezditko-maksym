import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        // Corrected URL for local development based on your config.toml
        // For iOS Simulator, 127.0.0.1 (localhost) is the correct address to reach the host machine.
        let supabaseURL = URL(string: "http://127.0.0.1:54321")!
        
        // IMPORTANT: You need to get this key from your local Supabase instance.
        // Run `supabase status` in your terminal inside the `supabase` directory.
        // Copy the `anon key` and paste it here.
        let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"

        self.client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseAnonKey
        )
    }
} 
