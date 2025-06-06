import SwiftUI

struct HealthMetricsView: View {
    @StateObject private var viewModel = HealthMetricViewModel()
    @State private var showingFormSheet = false

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 10) {
                Text("Track your daily progress and review your history.")
                    .padding(.horizontal)
                    .foregroundColor(.secondary)
                
                if viewModel.isLoading && viewModel.metrics.isEmpty {
                    ProgressView("Loading Metrics...")
                        .frame(maxWidth: .infinity)
                } else if let errorMessage = viewModel.errorMessage {
                    VStack {
                        Text("Error").font(.headline).foregroundColor(.red)
                        Text(errorMessage).padding()
                        Button("Retry") { Task { await viewModel.fetchMetrics() } }
                            .buttonStyle(.bordered)
                    }
                    .frame(maxWidth: .infinity)
                } else if viewModel.metrics.isEmpty {
                    Text("No health metrics recorded yet.")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                } else {
                    List {
                        ForEach(viewModel.metrics) { metric in
                            MetricRowView(metric: metric)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    viewModel.setForm(for: metric)
                                    showingFormSheet = true
                                }
                        }
                        .onDelete(perform: delete)
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.fetchMetrics()
                    }
                }
            }
            .navigationTitle("Health Metrics")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: {
                        viewModel.setForm(for: nil)
                        showingFormSheet = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showingFormSheet) {
                MetricFormView(viewModel: viewModel)
            }
            .task {
                await viewModel.fetchMetrics()
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        Task {
            await viewModel.deleteMetric(at: offsets)
        }
    }
}

// A view for a single row in the health metrics list
struct MetricRowView: View {
    let metric: HealthMetric

    var body: some View {
        HStack(spacing: 15) {
            Text(formattedDate(from: metric.date))
                .font(.headline)
                .frame(width: 80, alignment: .leading)
            
            VStack(alignment: .leading, spacing: 4) {
                if let steps = metric.steps {
                    Text("👣 Steps: \(steps)")
                }
                if let calories = metric.calories {
                    Text("🔥 Calories: \(calories)")
                }
                if let waterMl = metric.waterMl {
                    Text("💧 Water: \(waterMl) ml")
                }
            }
            Spacer()
        }
        .padding(.vertical, 8)
    }
    
    private func formattedDate(from dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        if let date = formatter.date(from: dateString) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return dateString
    }
}

// Renamed from CreateHealthMetricView to a more generic MetricFormView
struct MetricFormView: View {
    @ObservedObject var viewModel: HealthMetricViewModel
    @Environment(\.dismiss) private var dismiss

    private var isEditing: Bool {
        !viewModel.steps.isEmpty || !viewModel.calories.isEmpty || !viewModel.waterMl.isEmpty
    }

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Log Metric")) {
                    DatePicker("Date", selection: $viewModel.selectedDate, displayedComponents: .date)
                    
                    HStack {
                        Text("👣")
                        TextField("Steps", text: $viewModel.steps)
                            .keyboardType(.numberPad)
                    }
                    
                    HStack {
                        Text("🔥")
                        TextField("Calories", text: $viewModel.calories)
                            .keyboardType(.numberPad)
                    }
                    
                    HStack {
                        Text("💧")
                        TextField("Water (ml)", text: $viewModel.waterMl)
                            .keyboardType(.numberPad)
                    }
                }
                
                if let errorMessage = viewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Metric" : "New Metric")
            .navigationBarItems(
                leading: Button("Cancel") {
                    dismiss()
                },
                trailing: Button(isEditing ? "Update" : "Save") {
                    Task {
                        await viewModel.saveMetric()
                        if viewModel.errorMessage == nil {
                            dismiss()
                        }
                    }
                }
                .disabled(viewModel.isLoading)
            )
        }
    }
}

struct HealthMetricsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            HealthMetricsView()
        }
    }
} 