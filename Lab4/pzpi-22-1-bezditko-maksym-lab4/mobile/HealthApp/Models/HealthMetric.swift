import Foundation

/// Represents a health metric record from the database.
/// This struct conforms to `Codable` for easy decoding from Supabase
/// and `Identifiable` & `Hashable` for use in SwiftUI lists.
struct HealthMetric: Codable, Identifiable, Hashable {
    let id: String
    let date: String
    let steps: Int?
    let calories: Int?
    let waterMl: Int?
    let photoUrl: String?
    let userId: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "metric_id"
        case date
        case steps
        case calories
        case waterMl = "water_ml"
        case photoUrl = "photo_url"
        case userId = "user_id"
        case createdAt = "created_at"
    }
} 