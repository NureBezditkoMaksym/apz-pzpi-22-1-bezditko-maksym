import Foundation
import Combine

@MainActor
class ReportViewModel: ObservableObject {
    @Published var reports: [Report] = []
    @Published var isLoading = false
    @Published var isGenerating = false
    @Published var errorMessage: String?
    
    // Date range for generating a new report
    @Published var startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
    @Published var endDate = Date()

    private let reportService = ReportService.shared
    
    init() {
        Task {
            await fetchReports()
        }
    }

    func fetchReports() async {
        isLoading = true
        errorMessage = nil
        do {
            self.reports = try await reportService.fetchReports()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func generateReport() async {
        isGenerating = true
        errorMessage = nil
        do {
            try await reportService.generateAndSaveReport(from: startDate, to: endDate)
            // After generating, refresh the list to show the new report
            await fetchReports()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isGenerating = false
    }
    
    func deleteReport(at offsets: IndexSet) async {
        let reportsToDelete = offsets.map { self.reports[$0] }
        
        // Optimistically remove from UI
        self.reports.remove(atOffsets: offsets)
        
        // Attempt to delete from the database
        for report in reportsToDelete {
            do {
                try await reportService.deleteReport(reportId: report.id)
            } catch {
                self.errorMessage = "Failed to delete report: \(error.localizedDescription)"
                await fetchReports() // Re-sync with the database on failure
                break
            }
        }
    }
} 