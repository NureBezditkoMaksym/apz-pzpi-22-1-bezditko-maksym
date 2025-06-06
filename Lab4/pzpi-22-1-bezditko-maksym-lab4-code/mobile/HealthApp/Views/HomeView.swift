import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 25) {
                    Text("Welcome!")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    if viewModel.isLoading {
                        ProgressView("Loading summary...")
                            .frame(maxWidth: .infinity)
                    } else if let summary = viewModel.summary {
                        DashboardSummaryView(summary: summary)
                    } else {
                        Text("No recent activity to display. Start by logging a metric!")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                    
                    VStack(alignment: .leading) {
                        Text("Features")
                            .font(.title2)
                            .fontWeight(.bold)
                        NavigationLink(destination: HealthMetricsView()) {
                            FeatureRow(icon: "heart.text.square.fill", title: "Health Metrics", subtitle: "View & manage daily logs")
                        }
                        Divider()
                        NavigationLink(destination: ReportsView()) {
                            FeatureRow(icon: "chart.bar.xaxis", title: "Reports", subtitle: "Generate & view historical reports")
                        }
                    }
                    .padding()
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10))

                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .background(Color(UIColor.systemGroupedBackground))
            .task {
                await viewModel.fetchSummary()
            }
            .refreshable {
                await viewModel.fetchSummary()
            }
        }
    }
}

struct DashboardSummaryView: View {
    let summary: HealthSummary
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Last 7 Days Summary")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.bottom, 5)

            HStack {
                SummaryStatView(icon: "figure.walk", value: "\(summary.totalSteps)", label: "Total Steps")
                Spacer()
                SummaryStatView(icon: "flame.fill", value: String(format: "%.0f", summary.avgCalories), label: "Avg Calories/Day")
                Spacer()
                SummaryStatView(icon: "drop.fill", value: String(format: "%.0f", summary.avgWater), label: "Avg Water/Day (ml)")
            }
            .padding()
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct SummaryStatView: View {
    let icon: String
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.accentColor)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

/// A reusable view for feature navigation rows.
struct FeatureRow: View {
    let icon: String
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 15) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.accentColor)
                .frame(width: 40)
            
            VStack(alignment: .leading) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }
}

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
    }
} 