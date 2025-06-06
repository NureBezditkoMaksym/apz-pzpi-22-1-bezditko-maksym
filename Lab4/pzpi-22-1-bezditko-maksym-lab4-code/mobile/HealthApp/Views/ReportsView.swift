import SwiftUI

struct ReportsView: View {
    @StateObject private var viewModel = ReportViewModel()

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 10) {
                Text("Generate reports from your historical health data.")
                    .padding(.horizontal)
                    .foregroundColor(.secondary)
                
                // Report generation section
                ReportGeneratorView(viewModel: viewModel)
                
                Divider()
                
                if viewModel.isLoading && viewModel.reports.isEmpty {
                    ProgressView("Loading Reports...")
                        .frame(maxWidth: .infinity)
                } else if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red).padding()
                } else if viewModel.reports.isEmpty {
                    Text("No reports found. Generate one above!").padding()
                } else {
                    reportList
                }
                Spacer()
            }
            .navigationTitle("Health Reports")
        }
    }
    
    private func formattedDate(from dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        if let date = formatter.date(from: dateString) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return dateString // Fallback if parsing fails
    }
    
    private var reportList: some View {
        List {
            ForEach(viewModel.reports, id: \.self) { report in
                NavigationLink(destination: ReportDetailView(report: report)) {
                    VStack(alignment: .leading) {
                        Text("Report for \(report.reportData?.period ?? "N/A")")
                            .font(.headline)
                        Text("Generated on: \(formattedDate(from: report.reportDate))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .onDelete { offsets in
                Task {
                    await viewModel.deleteReport(at: offsets)
                }
            }
        }
    }
}

private struct ReportGeneratorView: View {
    @ObservedObject var viewModel: ReportViewModel

    var body: some View {
        VStack {
            HStack {
                DatePicker("Start Date", selection: $viewModel.startDate, displayedComponents: .date)
                DatePicker("End Date", selection: $viewModel.endDate, displayedComponents: .date)
            }
            Button(action: {
                Task { await viewModel.generateReport() }
            }) {
                if viewModel.isGenerating {
                    ProgressView()
                } else {
                    Text("Generate Report")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isGenerating)
        }
        .padding()
    }
}

struct ReportDetailView: View {
    let report: Report

    var body: some View {
        Form {
            if let data = report.reportData {
                Section(header: Text("Report Period: \(data.period)")) {
                    StatisticRow(name: "Days Tracked", value: "\(data.daysTracked)")
                    StatisticRow(name: "Total Steps", value: "\(data.totalSteps)")
                    StatisticRow(name: "Average Steps", value: String(format: "%.0f", data.avgSteps), unit: "/ day")
                    StatisticRow(name: "Total Calories", value: "\(data.totalCalories)", unit: "kcal")
                    StatisticRow(name: "Average Calories", value: String(format: "%.0f", data.avgCalories), unit: "kcal / day")
                    StatisticRow(name: "Total Water", value: "\(data.totalWater)", unit: "ml")
                    StatisticRow(name: "Average Water", value: String(format: "%.0f", data.avgWater), unit: "ml / day")
                }
            } else {
                Text("No data available for this report.")
            }
        }
        .navigationTitle("Report Details")
    }
}

private struct StatisticRow: View {
    let name: String
    let value: String
    var unit: String? = nil
    
    var body: some View {
        HStack {
            Text(name)
            Spacer()
            Text(value).fontWeight(.bold) + Text(unit ?? "").foregroundColor(.secondary)
        }
    }
}

struct ReportsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            ReportsView()
        }
    }
} 