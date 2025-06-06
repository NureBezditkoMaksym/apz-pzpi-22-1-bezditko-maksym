import Foundation

/// Represents a single report record from the `reports` database table.
struct Report: Codable, Identifiable, Hashable {
    let id: String
    let reportDate: String
    let userId: String
    let reportData: ReportData? // The decoded JSON data blob

    enum CodingKeys: String, CodingKey {
        case id = "report_id"
        case reportDate = "report_date"
        case userId = "user_id"
        case reportData = "report_data"
    }
} 