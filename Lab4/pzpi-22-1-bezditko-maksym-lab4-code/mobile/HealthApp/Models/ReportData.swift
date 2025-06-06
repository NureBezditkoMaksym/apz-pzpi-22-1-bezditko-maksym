import Foundation

/// Represents the calculated data blob stored within a `Report`.
/// This struct is `Codable` to allow easy encoding/decoding from the JSON `report_data` column.
struct ReportData: Codable, Hashable {
    let period: String
    let totalSteps: Int
    let avgSteps: Double
    let totalCalories: Int
    let avgCalories: Double
    let totalWater: Int
    let avgWater: Double
    let daysTracked: Int
    
    // Custom coding keys to match the web app's JSON structure, if needed.
    // For now, we assume Swift's synthesized keys will work.
    enum CodingKeys: String, CodingKey {
        case period
        case totalSteps
        case avgSteps
        case totalCalories
        case avgCalories
        case totalWater
        case avgWater
        case daysTracked
    }
} 