import Foundation
import Combine

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    // Editable fields
    @Published var username = ""
    @Published var phone = ""

    private let profileService = ProfileService.shared
    
    func initialize() async {
        await fetchProfile()
        
        // Populate editable fields
        if let profile = userProfile {
            self.username = profile.username
            self.phone = profile.phone ?? ""
        }
    }

    func fetchProfile() async {
        isLoading = true
        errorMessage = nil
        do {
            self.userProfile = try await profileService.fetchUserProfile()
        } catch {
            self.errorMessage = "Failed to fetch profile: \(error.localizedDescription)"
        }
        isLoading = false
    }
    
    func updateProfile() async {
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        do {
            try await profileService.updateUserProfile(username: username, phone: phone.isEmpty ? nil : phone)
            await fetchProfile() // Refresh data after update
            self.successMessage = "Profile updated successfully!"
        } catch {
            self.errorMessage = "Failed to update profile: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
} 