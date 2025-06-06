import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = AuthViewModel()
    @State private var showingSignUpView = false

    var body: some View {
        ZStack {
            // Background gradient similar to the web version
            LinearGradient(
                gradient: Gradient(colors: [Color(red: 0.4, green: 0.49, blue: 0.92), Color(red: 0.46, green: 0.29, blue: 0.64)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                // Card View
                VStack(spacing: 20) {
                    Text("Welcome Back!")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .padding(.bottom, 10)

                    Text("Sign in to your account")
                        .foregroundColor(.secondary)

                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                            .padding(.vertical, 5)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(5)
                    }

                    TextField("Email", text: $viewModel.email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .padding()
                        .background(Color(UIColor.systemGray6))
                        .cornerRadius(8)

                    SecureField("Password", text: $viewModel.password)
                        .padding()
                        .background(Color(UIColor.systemGray6))
                        .cornerRadius(8)

                    Button(action: {
                        Task {
                            await viewModel.signIn()
                        }
                    }) {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Log In")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .background(viewModel.isLoading ? Color.gray : Color.blue)
                        .cornerRadius(8)
                    }
                    .disabled(viewModel.isLoading)
                    .padding(.top, 10)

                    Button("Don't have an account? Sign Up") {
                        showingSignUpView = true
                    }
                    .padding(.top, 15)
                    .font(.footnote)
                }
                .padding(30)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
                .padding()
            }
            .ignoresSafeArea(.keyboard)
        }
        .sheet(isPresented: $showingSignUpView) {
            SignUpView()
        }
        .onAppear {
            viewModel.clearErrorMessage()
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
    }
} 