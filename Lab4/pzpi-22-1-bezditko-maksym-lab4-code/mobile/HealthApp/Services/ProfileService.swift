import Foundation
import Supabase

private struct ProfileUpdate: Encodable {
    let username: String
    let phone: String?
    let updated_at: String
}

class ProfileService {
    static let shared = ProfileService()
    private let client = SupabaseManager.shared.client
    
    /// Fetches the full user profile from the `users` table.
    func fetchUserProfile() async throws -> UserProfile? {
        guard let userId = AuthService.shared.user?.id else {
            throw NSError(domain: "ProfileServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }
        
        let response: [UserProfile] = try await client.database
            .from("users")
            // Explicitly select all columns for clarity and to ensure 'phone' is included.
            .select("id, updated_at, username, email, phone, is_premium")
            .eq("auth_id", value: userId.uuidString)
            .limit(1)
            .execute()
            .value
        
        return response.first
    }
    
    /// Updates the user's profile information.
    func updateUserProfile(username: String, phone: String?) async throws {
        guard let userId = AuthService.shared.user?.id else {
            throw NSError(domain: "ProfileServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User not authenticated"])
        }
        
        let update = ProfileUpdate(
            username: username,
            phone: phone,
            updated_at: DateFormatter.iso8601Full.string(from: Date())
        )
        
        try await client.database
            .from("users")
            .update(update)
            .eq("auth_id", value: userId.uuidString)
            .execute()
    }
} 