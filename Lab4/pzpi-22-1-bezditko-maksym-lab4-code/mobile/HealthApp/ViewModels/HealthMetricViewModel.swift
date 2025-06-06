import Foundation
import Combine

@MainActor
class HealthMetricViewModel: ObservableObject {
    @Published var metrics: [HealthMetric] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Form properties
    @Published var selectedDate = Date()
    @Published var steps = ""
    @Published var calories = ""
    @Published var waterMl = ""
    
    // The metric currently being edited. If nil, the form is for creating a new metric.
    private var editingMetric: HealthMetric?

    private let healthMetricService = HealthMetricService.shared

    func fetchMetrics() async {
        isLoading = true
        errorMessage = nil
        do {
            self.metrics = try await healthMetricService.fetchHealthMetrics()
        } catch {
            self.errorMessage = "Failed to fetch health metrics: \(error.localizedDescription)"
        }
        isLoading = false
    }
    
    /// Deletes a metric at the specified offsets in the metrics array.
    func deleteMetric(at offsets: IndexSet) async {
        let metricsToDelete = offsets.map { self.metrics[$0] }
        
        // Optimistically remove from UI
        self.metrics.remove(atOffsets: offsets)
        
        // Attempt to delete from the database
        for metric in metricsToDelete {
            do {
                try await healthMetricService.deleteHealthMetric(metricId: metric.id)
            } catch {
                // If deletion fails, add it back to the list and show an error
                self.errorMessage = "Failed to delete metric: \(error.localizedDescription)"
                await fetchMetrics() // Re-fetch to ensure UI is consistent with DB
                break // Exit loop on first error
            }
        }
    }

    /// Determines whether to create a new metric or update an existing one.
    func saveMetric() async {
        if let editingMetric = editingMetric {
            await updateMetric(id: editingMetric.id)
        } else {
            await addMetric()
        }
    }

    private func addMetric() async {
        isLoading = true
        errorMessage = nil
        
        let stepsInt = Int(steps.trimmingCharacters(in: .whitespaces))
        let caloriesInt = Int(calories.trimmingCharacters(in: .whitespaces))
        let waterMlInt = Int(waterMl.trimmingCharacters(in: .whitespaces))
        
        do {
            try await healthMetricService.createHealthMetric(
                date: selectedDate,
                steps: stepsInt,
                calories: caloriesInt,
                waterMl: waterMlInt
            )
            await fetchMetrics()
        } catch {
            self.errorMessage = "Failed to add health metric: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    private func updateMetric(id: String) async {
        isLoading = true
        errorMessage = nil
        
        let stepsInt = Int(steps.trimmingCharacters(in: .whitespaces))
        let caloriesInt = Int(calories.trimmingCharacters(in: .whitespaces))
        let waterMlInt = Int(waterMl.trimmingCharacters(in: .whitespaces))
        
        do {
            try await healthMetricService.updateHealthMetric(
                metricId: id,
                date: selectedDate,
                steps: stepsInt,
                calories: caloriesInt,
                waterMl: waterMlInt
            )
            await fetchMetrics()
        } catch {
            self.errorMessage = "Failed to update health metric: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    /// Configures the form for either creating or editing a metric.
    /// - Parameter metric: The metric to edit, or `nil` to create a new one.
    func setForm(for metric: HealthMetric?) {
        editingMetric = metric
        if let metric = metric {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            
            selectedDate = formatter.date(from: metric.date) ?? Date()
            steps = metric.steps.map { String($0) } ?? ""
            calories = metric.calories.map { String($0) } ?? ""
            waterMl = metric.waterMl.map { String($0) } ?? ""
        } else {
            selectedDate = Date()
            steps = ""
            calories = ""
            waterMl = ""
        }
    }
} 