import Foundation

/// A simple struct to hold summary data for the dashboard.
struct HealthSummary {
    let totalSteps: Int
    let avgCalories: Double
    let avgWater: Double
    let daysTracked: Int
}

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var summary: HealthSummary?
    @Published var isLoading = true
    
    private let client = SupabaseManager.shared.client

    func fetchSummary() async {
        await MainActor.run { self.isLoading = true }
        
        guard let userId = AuthService.shared.userProfile?.id,
              let startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) else {
            // If the profile isn't loaded yet, we can't fetch. This is expected on first load.
            await MainActor.run { self.isLoading = false }
            return
        }

        let startDateString = DateFormatter.iso8601Full.string(from: startDate)
        
        do {
            let metrics: [HealthMetric] = try await client.database
                .from("health_metrics")
                .select()
                .eq("user_id", value: userId) // Use public profile ID
                .gte("date", value: startDateString)
                .execute()
                .value
            
            let daysTracked = metrics.count
            let totalSteps = metrics.compactMap(\.steps).reduce(0, +)
            let totalCalories = metrics.compactMap(\.calories).reduce(0, +)
            let totalWater = metrics.compactMap(\.waterMl).reduce(0, +)
            
            self.summary = HealthSummary(
                totalSteps: totalSteps,
                avgCalories: daysTracked > 0 ? Double(totalCalories) / Double(daysTracked) : 0,
                avgWater: daysTracked > 0 ? Double(totalWater) / Double(daysTracked) : 0,
                daysTracked: daysTracked
            )
        } catch {
            // Handle error silently on dashboard, or set an error message
            print("Failed to fetch dashboard summary: \(error.localizedDescription)")
        }
        
        isLoading = false
    }
} 