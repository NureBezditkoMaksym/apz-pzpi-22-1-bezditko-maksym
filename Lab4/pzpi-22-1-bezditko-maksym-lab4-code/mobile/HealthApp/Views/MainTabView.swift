import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }
            
            HealthMetricsView()
                .tabItem {
                    Label("Metrics", systemImage: "heart.text.square.fill")
                }
            
            ReportsView()
                .tabItem {
                    Label("Reports", systemImage: "chart.bar.xaxis")
                }

            NotificationsView()
                .tabItem {
                    Label("Notifications", systemImage: "bell.fill")
                }
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
} 