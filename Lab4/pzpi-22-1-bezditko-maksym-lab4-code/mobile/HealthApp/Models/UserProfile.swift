import Foundation

/// Represents the user's public profile data from the `users` table.
struct UserProfile: Codable, Identifiable, Hashable {
    let id: String
    let updatedAt: Date?
    let username: String
    let email: String
    let phone: String?
    let isPremium: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case updatedAt = "updated_at"
        case username, email, phone
        case isPremium = "is_premium"
    }
} 