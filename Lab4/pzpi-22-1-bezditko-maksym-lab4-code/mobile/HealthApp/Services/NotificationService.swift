import Foundation
import Supabase

class NotificationService {
    static let shared = NotificationService()
    private let client = SupabaseManager.shared.client

    /// Fetches all notifications for the currently logged-in user.
    func fetchNotifications() async throws -> [AppNotification] {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "NotificationServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User profile not available"])
        }

        let response: [AppNotification] = try await client.database
            .from("notifications")
            .select()
            .eq("user_id", value: userId)
            .order("sent_at", ascending: false)
            .execute()
            .value
            
        return response
    }
    
    /// Deletes a notification by its ID.
    func deleteNotification(id: String) async throws {
        try await client.database
            .from("notifications")
            .delete()
            .eq("id", value: id)
            .execute()
    }
} 