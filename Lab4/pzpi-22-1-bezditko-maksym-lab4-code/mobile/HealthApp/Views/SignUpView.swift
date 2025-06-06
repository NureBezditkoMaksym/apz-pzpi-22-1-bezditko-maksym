import SwiftUI

struct SignUpView: View {
    @StateObject private var viewModel = AuthViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color(red: 0.4, green: 0.49, blue: 0.92), Color(red: 0.46, green: 0.29, blue: 0.64)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Show success view or sign up form
            if viewModel.signUpSuccess {
                SignUpSuccessView(onSwitchToLogin: {
                    dismiss()
                })
            } else {
                signUpForm
            }
        }
        .onAppear {
             viewModel.clearErrorMessage()
        }
    }

    private var signUpForm: some View {
        ScrollView {
            VStack(spacing: 15) {
                Text("Create Account")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.bottom, 10)
                    
                Text("Join us today")
                    .foregroundColor(.secondary)

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.vertical, 5)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(5)
                }

                TextField("Email", text: $viewModel.email)
                    .textFieldStyle()

                TextField("Username", text: $viewModel.username)
                    .textFieldStyle()
                    .autocapitalization(.none)

                SecureField("Password", text: $viewModel.password)
                    .textFieldStyle()
                
                // Password Strength Indicator
                if !viewModel.password.isEmpty {
                    passwordStrengthIndicator
                }
                
                SecureField("Confirm Password", text: $viewModel.confirmPassword)
                    .textFieldStyle()

                Button(action: {
                    Task {
                        await viewModel.signUp()
                    }
                }) {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Create Account")
                        }
                    }
                    .buttonStyle()
                }
                .disabled(viewModel.isLoading)
                .padding(.top, 10)
                
                Button("Already have an account? Log In") {
                    dismiss()
                }
                .padding(.top, 15)
                .font(.footnote)
                .tint(.white)
            }
            .padding(30)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
            .padding()
        }
        .ignoresSafeArea(.keyboard)
    }
    
    private var passwordStrengthIndicator: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Password Strength")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text(viewModel.passwordStrengthText)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(viewModel.passwordStrengthColor)
            }
            ProgressView(value: viewModel.passwordStrength)
                .progressViewStyle(LinearProgressViewStyle(tint: viewModel.passwordStrengthColor))
                .animation(.easeInOut, value: viewModel.passwordStrength)
        }
    }
}

// Success View Component
struct SignUpSuccessView: View {
    var onSwitchToLogin: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("Account Created!")
                .font(.largeTitle)
                .fontWeight(.bold)
                
            Text("Please check your email to verify your account before signing in.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
                
            Button("Go to Sign In") {
                onSwitchToLogin()
            }
            .buttonStyle()
        }
        .padding(30)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .padding()
    }
}

// Custom View Modifiers for DRY code
struct CustomTextFieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color(UIColor.systemGray6))
            .cornerRadius(8)
            .disableAutocorrection(true)
    }
}

extension View {
    func textFieldStyle() -> some View {
        self.modifier(CustomTextFieldStyle())
    }
    
    func buttonStyle() -> some View {
        self
            .frame(maxWidth: .infinity)
            .padding()
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .background(Color.blue)
            .cornerRadius(8)
    }
}

struct SignUpView_Previews: PreviewProvider {
    static var previews: some View {
        SignUpView()
    }
} 