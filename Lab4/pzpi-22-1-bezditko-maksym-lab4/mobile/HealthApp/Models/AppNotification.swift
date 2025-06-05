import Foundation

/// Represents a notification record from the `notifications` table.
/// I've named it `AppNotification` to avoid conflicts with Foundation's `Notification` class.
struct AppNotification: Codable, Identifiable, Hashable {
    let id: String
    let message: String
    let sentAt: Date?
    let userId: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "notification_id"
        case message
        case sentAt = "sent_at"
        case userId = "user_id"
    }
} 