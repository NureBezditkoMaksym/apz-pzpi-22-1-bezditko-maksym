import SwiftUI

struct MainView: View {
    @StateObject private var authService = AuthService.shared

    var body: some View {
        // Group to ensure smooth transitions when authService.isLoading changes
        Group {
            if authService.isLoading && !authService.isAuthenticated { // Show loading only on initial load before auth state is known
                VStack {
                    Text("Loading...")
                    ProgressView()
                }
            } else if authService.isAuthenticated {
                MainTabView()
                    .transition(.asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading)))
            } else {
                LoginView()
                    .transition(.asymmetric(insertion: .move(edge: .leading), removal: .move(edge: .trailing)))
            }
        }
        .animation(.default, value: authService.isAuthenticated) // Animate changes based on isAuthenticated
        .animation(.default, value: authService.isLoading)
        // No need for onAppear to check auth state here, AuthService handles it internally.
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
} 