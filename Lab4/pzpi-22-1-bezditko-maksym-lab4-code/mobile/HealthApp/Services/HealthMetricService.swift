import Foundation
import Supabase

/// A helper struct for inserting a new health metric,
/// matching the database table structure.
private struct HealthMetricInsert: Encodable {
    let date: String
    let steps: Int?
    let calories: Int?
    let water_ml: Int?
    let user_id: String
}

/// A helper struct for updating a health metric.
private struct HealthMetricUpdate: Encodable {
    let date: String?
    let steps: Int?
    let calories: Int?
    let water_ml: Int?
}

/// Service class to manage all database operations for health metrics.
class HealthMetricService {
    static let shared = HealthMetricService()
    private let client = SupabaseManager.shared.client

    /// Fetches all health metrics for the currently logged-in user,
    /// ordered by date descending.
    func fetchHealthMetrics() async throws -> [HealthMetric] {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "HealthMetricServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User profile not available"])
        }
        
        let response: [HealthMetric] = try await client.database
            .from("health_metrics")
            .select()
            .eq("user_id", value: userId)
            .order("date", ascending: false)
            .execute()
            .value
            
        return response
    }

    /// Creates a new health metric record in the database.
    /// - Parameters:
    ///   - date: The date for the new metric.
    ///   - steps: The number of steps taken.
    ///   - calories: The number of calories consumed.
    ///   - waterMl: The amount of water consumed in milliliters.
    func createHealthMetric(date: Date, steps: Int?, calories: Int?, waterMl: Int?) async throws {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "HealthMetricServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User profile not available"])
        }

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]
        let dateString = dateFormatter.string(from: date)

        let newMetric = HealthMetricInsert(
            date: dateString,
            steps: steps,
            calories: calories,
            water_ml: waterMl,
            user_id: userId
        )

        try await client.database
            .from("health_metrics")
            .insert(newMetric)
            .execute()
    }

    /// Updates an existing health metric in the database.
    func updateHealthMetric(metricId: String, date: Date, steps: Int?, calories: Int?, waterMl: Int?) async throws {
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]
        let dateString = dateFormatter.string(from: date)

        let updatedMetric = HealthMetricUpdate(
            date: dateString,
            steps: steps,
            calories: calories,
            water_ml: waterMl
        )

        try await client.database
            .from("health_metrics")
            .update(updatedMetric)
            .eq("metric_id", value: metricId)
            .execute()
    }

    /// Deletes a specific health metric from the database.
    func deleteHealthMetric(metricId: String) async throws {
        try await client.database
            .from("health_metrics")
            .delete()
            .eq("metric_id", value: metricId)
            .execute()
    }
} 