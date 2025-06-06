import Foundation
import Combine
import SwiftUI // For @MainActor
import Supabase // Import Supabase for the User type

@MainActor // Ensure UI-related updates happen on the main thread
class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var username = ""
    @Published var confirmPassword = ""
    
    // Password Strength
    @Published var passwordStrength: Double = 0
    @Published var passwordStrengthText = ""
    @Published var passwordStrengthColor: Color = .red
    
    // Forwarded properties from AuthService
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    @Published var user: Supabase.User? = nil // Explicitly use Supabase.User
    
    // State for the success view
    @Published var signUpSuccess = false

    private var cancellables = Set<AnyCancellable>()
    private let authService = AuthService.shared

    init() {
        // Subscribe to AuthService's published properties
        authService.$isAuthenticated
            .receive(on: DispatchQueue.main) // AuthService already ensures its properties are updated on main
            .assign(to: &$isAuthenticated)
        
        authService.$isLoading
            .receive(on: DispatchQueue.main)
            .assign(to: &$isLoading)

        authService.$errorMessage
            .receive(on: DispatchQueue.main)
            .assign(to: &$errorMessage)
        
        authService.$user
            .receive(on: DispatchQueue.main)
            .assign(to: &$user)
        
        // Subscribe to password changes to update strength meter
        $password
            .debounce(for: .milliseconds(200), scheduler: RunLoop.main)
            .sink { [weak self] newPassword in
                self?.updatePasswordStrength(password: newPassword)
            }
            .store(in: &cancellables)
    }

    func signUp() async {
        guard validateInput() else { return }
        
        // This is a view-specific state, so we handle it here.
        // The service's isLoading will be set to false by the auth state change.
        await MainActor.run {
            self.isLoading = true
        }
        
        await authService.signUp(email: email, password: password, username: username)
        
        // Check if there was an error from the service
        if authService.errorMessage == nil {
            await MainActor.run {
                self.signUpSuccess = true
                self.isLoading = false
            }
        } else {
            await MainActor.run {
                self.isLoading = false
            }
        }
    }

    private func validateInput() -> Bool {
        if username.count < 3 {
            errorMessage = "Username must be at least 3 characters."
            return false
        }
        if !username.matches("^[a-zA-Z0-9_]+$") {
            errorMessage = "Username can only contain letters, numbers, and underscores."
            return false
        }
        if password.count < 8 {
            errorMessage = "Password must be at least 8 characters."
            return false
        }
        if password != confirmPassword {
            errorMessage = "The passwords do not match."
            return false
        }
        errorMessage = nil
        return true
    }

    private func updatePasswordStrength(password: String) {
        var strength: Double = 0
        if password.count >= 8 { strength += 0.25 }
        if password.rangeOfCharacter(from: .lowercaseLetters) != nil { strength += 0.25 }
        if password.rangeOfCharacter(from: .uppercaseLetters) != nil { strength += 0.25 }
        if password.rangeOfCharacter(from: .decimalDigits) != nil { strength += 0.25 }
        
        self.passwordStrength = strength
        
        switch strength {
        case 0...0.25:
            self.passwordStrengthText = "Very Weak"
            self.passwordStrengthColor = .red
        case 0.5:
            self.passwordStrengthText = "Weak"
            self.passwordStrengthColor = .orange
        case 0.75:
            self.passwordStrengthText = "Good"
            self.passwordStrengthColor = .yellow
        case 1.0:
            self.passwordStrengthText = "Strong"
            self.passwordStrengthColor = .green
        default:
            self.passwordStrengthText = ""
            self.passwordStrengthColor = .clear
        }
    }

    func signIn() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Email and password cannot be empty."
            return
        }
        await authService.signIn(email: email, password: password)
    }

    func signOut() async {
        await authService.signOut()
    }
    
    func clearErrorMessage() {
        errorMessage = nil
    }
}

// Helper extension for regex matching
extension String {
    func matches(_ regex: String) -> Bool {
        return self.range(of: regex, options: .regularExpression, range: nil, locale: nil) != nil
    }
} 