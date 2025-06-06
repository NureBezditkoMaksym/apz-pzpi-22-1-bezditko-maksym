import Foundation
import Supabase
import Combine

class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var session: Session?
    @Published var user: Supabase.User?
    @Published var userProfile: UserProfile? // The user's public profile
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    // Task to manage the observation of auth state changes
    private var authStateTask: Task<Void, Never>? = nil

    private let client = SupabaseManager.shared.client

    private init() {
        // Start observing authentication state changes
        authStateTask = Task {
            // Ensure this loop runs on the main actor for UI updates
            // or dispatch to main actor specifically where UI properties are updated.
            for await (event, session) in await client.auth.authStateChanges {
                // Ensure updates to @Published properties are on the main thread
                await MainActor.run {
                    let wasAuthenticated = self.isAuthenticated
                    self.session = session
                    self.user = session?.user
                    self.isAuthenticated = session?.user != nil
                    self.isLoading = false // Reset loading state on auth change
                    
                    // If we just logged in, fetch the user profile.
                    if self.isAuthenticated && !wasAuthenticated {
                        Task { await self.fetchUserProfile() }
                    }
                    // If we just logged out, clear the user profile.
                    else if !self.isAuthenticated && wasAuthenticated {
                        self.userProfile = nil
                    }
                    
                    // Optional: Handle specific events
                    // switch event {
                    // case .signedIn, .initialSession, .signedOut, .userUpdated, .userDeleted, .tokenRefreshed:
                    //     break
                    // case .passwordRecovery:
                    //     self.errorMessage = "Password recovery email sent."
                    //     break
                    // }
                }
            }
        }
        
        // Check initial session state
        Task {
            await getInitialSession()
        }
    }
    
    deinit {
        // Cancel the task when the AuthService is deinitialized
        authStateTask?.cancel()
    }

    func getInitialSession() async {
        await MainActor.run {
            self.isLoading = true
        }
        do {
            let currentSession = try await client.auth.session
            await MainActor.run {
                self.session = currentSession
                self.user = currentSession.user
                self.isAuthenticated = currentSession.user != nil
            }
            if self.isAuthenticated {
                await self.fetchUserProfile()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Error fetching initial session: \(error.localizedDescription)"
            }
        }
        await MainActor.run { self.isLoading = false }
    }
    
    private func fetchUserProfile() async {
        guard self.isAuthenticated else { return }
        do {
            let profile = try await ProfileService.shared.fetchUserProfile()
            await MainActor.run {
                self.userProfile = profile
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Could not load user profile."
            }
        }
    }

    func signUp(email: String, password: String, username: String) async {
        await MainActor.run {
            self.isLoading = true
            self.errorMessage = nil
        }
        do {
            _ = try await client.auth.signUp(
                email: email,
                password: password,
                data: ["username": .string(username)]
            )
            // Auth state change listener will update published properties, but we won't be logged in yet
            // if email confirmation is required.
        } catch let error as AuthError {
            await MainActor.run {
                switch error {
                case .weakPassword(let message):
                    self.errorMessage = "The password is too weak: \(message)"
                default:
                    // A specific .userAlreadyExists case doesn't exist.
                    // The server often returns a generic error for this, so we provide a general message.
                    self.errorMessage = "Could not create account. A user with this email may already exist. (\(error.localizedDescription))"
                }
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "An unexpected error occurred during sign-up: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    func signIn(email: String, password: String) async {
        await MainActor.run {
            self.isLoading = true
            self.errorMessage = nil
        }
        do {
            _ = try await client.auth.signIn(email: email, password: password)
            // Auth state change listener will update published properties
        } catch is AuthError {
            await MainActor.run {
                // The most common sign-in errors (wrong password, user not found, unconfirmed email)
                // are returned as a generic AuthError by the API.
                // We provide a single, clear message for all these cases.
                self.errorMessage = "Invalid email or password. Please check your credentials and try again."
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "An unexpected error occurred: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    func signOut() async {
        await MainActor.run {
            self.isLoading = true
            self.errorMessage = nil
        }
        do {
            try await client.auth.signOut()
            // Auth state change listener will update published properties
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
} 