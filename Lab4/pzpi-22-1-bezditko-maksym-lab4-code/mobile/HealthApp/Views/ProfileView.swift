import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        NavigationView {
            Form {
                if let profile = viewModel.userProfile {
                    Section(header: Text("Personal Information")) {
                        TextField("Username", text: $viewModel.username)
                        TextField("Phone Number", text: $viewModel.phone)
                            .keyboardType(.phonePad)
                        LabeledContent("Email") {
                            Text(profile.email)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Section(header: Text("Subscription")) {
                        LabeledContent("Status") {
                            Text(profile.isPremium == true ? "Premium" : "Standard")
                                .foregroundColor(profile.isPremium == true ? .purple : .secondary)
                        }
                    }

                    if let successMessage = viewModel.successMessage {
                        Text(successMessage).foregroundColor(.green)
                    }
                    
                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage).foregroundColor(.red)
                    }

                    Button(action: { Task { await viewModel.updateProfile() } }) {
                        HStack {
                            Spacer()
                            if viewModel.isLoading { ProgressView() } else { Text("Save Changes") }
                            Spacer()
                        }
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading Profile...")
                } else {
                    Text("Could not load profile. Please try again.")
                }
                
                Section(header: Text("Account Actions")) {
                    Button("Log Out", role: .destructive) {
                        Task { await AuthService.shared.signOut() }
                    }
                }
            }
            .navigationTitle("Profile")
            .task {
                await viewModel.initialize()
            }
            .refreshable {
                await viewModel.fetchProfile()
            }
        }
    }
}

// Helper for LabeledContent, which is only available on iOS 16+
struct LabeledContent<Content: View>: View {
    let title: String
    let content: Content
    
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        HStack {
            Text(title)
            Spacer()
            content
        }
    }
}

struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
    }
} 