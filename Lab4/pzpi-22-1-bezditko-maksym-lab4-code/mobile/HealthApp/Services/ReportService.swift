import Foundation
import Supabase

private struct ReportInsert: Encodable {
    let report_date: String
    let report_data: ReportData
    let user_id: String
}

/// Service to manage all database and business logic for reports.
class ReportService {
    static let shared = ReportService()
    private let client = SupabaseManager.shared.client

    /// Generates a report from health metrics within a date range and saves it to the database.
    func generateAndSaveReport(from startDate: Date, to endDate: Date) async throws {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "ReportServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User profile not available"])
        }

        // 1. Fetch metrics for the period
        let metrics: [HealthMetric] = try await client.database
            .from("health_metrics")
            .select()
            .eq("user_id", value: userId)
            .gte("date", value: DateFormatter.iso8601Full.string(from: startDate))
            .lte("date", value: DateFormatter.iso8601Full.string(from: endDate))
            .execute()
            .value

        guard !metrics.isEmpty else {
            throw NSError(domain: "ReportServiceError", code: 0, userInfo: [NSLocalizedDescriptionKey: "No health data found for the selected period."])
        }

        // 2. Calculate statistics
        let daysTracked = metrics.count
        let totalSteps = metrics.compactMap(\.steps).reduce(0, +)
        let totalCalories = metrics.compactMap(\.calories).reduce(0, +)
        let totalWater = metrics.compactMap(\.waterMl).reduce(0, +)

        let reportData = ReportData(
            period: "\(startDate.formatted(.abbreviated)) - \(endDate.formatted(.abbreviated))",
            totalSteps: totalSteps,
            avgSteps: daysTracked > 0 ? Double(totalSteps) / Double(daysTracked) : 0,
            totalCalories: totalCalories,
            avgCalories: daysTracked > 0 ? Double(totalCalories) / Double(daysTracked) : 0,
            totalWater: totalWater,
            avgWater: daysTracked > 0 ? Double(totalWater) / Double(daysTracked) : 0,
            daysTracked: daysTracked
        )

        // 3. Save the new report
        let newReport = ReportInsert(
            report_date: DateFormatter.iso8601Full.string(from: Date()),
            report_data: reportData,
            user_id: userId
        )

        try await client.database
            .from("reports")
            .insert(newReport)
            .execute()
    }

    /// Fetches all reports for the current user.
    func fetchReports() async throws -> [Report] {
        guard let userId = AuthService.shared.userProfile?.id else {
            throw NSError(domain: "ReportServiceError", code: -1, userInfo: [NSLocalizedDescriptionKey: "User profile not available"])
        }

        let reports: [Report] = try await client.database
            .from("reports")
            .select()
            .eq("user_id", value: userId)
            .order("report_date", ascending: false)
            .execute()
            .value
            
        return reports
    }
    
    /// Deletes a specific report.
    func deleteReport(reportId: String) async throws {
        try await client.database
            .from("reports")
            .delete()
            .eq("report_id", value: reportId)
            .execute()
    }
}

// DateFormatter helper
extension DateFormatter {
    static let iso8601Full: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter
    }()
}

extension Date {
    func formatted(_ style: Date.FormatStyle.DateStyle) -> String {
        self.formatted(date: style, time: .omitted)
    }
} 