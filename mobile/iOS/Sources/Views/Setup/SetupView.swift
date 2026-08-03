import SwiftUI

struct SetupView: View {
    @State private var page: SetupPage = .welcome
    @State private var baseURL = "https://music.serika.dev"
    @State private var api = MusicyAPI.shared

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            auroraBackground
            VStack {
                switch page {
                case .welcome:
                    WelcomeSetupPage { page = .server }
                case .server:
                    ServerSetupPage(baseURL: $baseURL) {
                        page = .welcome
                    } onContinue: {
                        page = .auth
                    }
                case .auth:
                    AuthSetupPage(baseURL: baseURL) { key, user in
                        api.baseURL = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                        api.apiKey = key
                        api.userName = user.displayName ?? user.username ?? user.email
                        page = .welcome
                    } onBack: {
                        page = .server
                    }
                }
            }
            .padding()
        }
    }

    private var auroraBackground: some View {
        GeometryReader { geo in
            Circle()
                .fill(Color("AccentColor").opacity(0.18))
                .frame(width: geo.size.width * 1.2, height: geo.size.width * 1.2)
                .offset(x: -geo.size.width * 0.4, y: -geo.size.height * 0.3)
                .blur(radius: 80)
            Circle()
                .fill(Color.purple.opacity(0.12))
                .frame(width: geo.size.width, height: geo.size.width)
                .offset(x: geo.size.width * 0.3, y: -geo.size.height * 0.2)
                .blur(radius: 80)
        }
        .ignoresSafeArea()
    }
}

private enum SetupPage {
    case welcome, server, auth
}

private struct WelcomeSetupPage: View {
    var onStart: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                RoundedRectangle(cornerRadius: 28)
                    .fill(Color("Surface"))
                    .frame(width: 120, height: 120)
                Image(systemName: "music.note")
                    .font(.system(size: 64))
                    .foregroundColor(Color("AccentColor"))
            }
            Text("Musicy")
                .font(.system(size: 42, weight: .black))
            Text("Your music. Everywhere.")
                .font(.title3)
                .foregroundColor(.secondary)
            Spacer()
            Text("Connect to your Musicy server, log in, and take your library on the road — with CarPlay.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
            Button("Get started", action: onStart)
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentColor"))
                .controlSize(.large)
        }
    }
}

private struct ServerSetupPage: View {
    @Binding var baseURL: String
    @State private var testing = false
    @State private var testResult: String?
    var onBack: () -> Void
    var onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Where's your Musicy server?")
                .font(.title.bold())
            Text("Enter the URL of the Musicy instance you want to use. Self-hosted? Use your own domain.")
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Server URL")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("https://music.serika.dev", text: $baseURL)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
            }

            if let result = testResult {
                HStack(spacing: 8) {
                    Image(systemName: result.hasPrefix("OK") ? "checkmark.circle" : "xmark.circle")
                    Text(result)
                    Spacer()
                }
                .foregroundColor(result.hasPrefix("OK") ? .green : .red)
                .font(.callout)
            }

            HStack(spacing: 12) {
                Button("Back", action: onBack)
                    .buttonStyle(.bordered)
                Spacer()
                Button {
                    Task { await test() }
                } label: {
                    if testing { ProgressView() } else { Text("Test connection") }
                }
                .disabled(testing || baseURL.isEmpty)
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentColor"))
            }

            Button("Continue", action: onContinue)
                .buttonStyle(.borderedProminent)
                .disabled(baseURL.isEmpty)
                .frame(maxWidth: .infinity)
        }
    }

    private func test() async {
        testing = true
        testResult = nil
        let api = MusicyAPI.shared
        api.baseURL = baseURL
        api.apiKey = ""
        do {
            let settings = try await api.getPublicSettings()
            let siteName = settings.settings["SITE_NAME"] ?? settings.settings["site_name"] ?? baseURL
            testResult = "OK: connected to \(siteName)"
        } catch {
            testResult = "Error: \(error.localizedDescription)"
        }
        testing = false
    }
}

private struct AuthSetupPage: View {
    var baseURL: String
    var onAuthenticated: (String, User) -> Void
    var onBack: () -> Void
    @State private var isLogin = true
    @State private var email = ""
    @State private var username = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var loading = false
    @State private var error: String?
    @State private var api = MusicyAPI.shared

    var body: some View {
        VStack(spacing: 20) {
            Text(isLogin ? "Welcome back" : "Create account")
                .font(.title.bold())
            Text("\(isLogin ? "Log in to" : "Sign up on") \(baseURL)")
                .foregroundColor(.secondary)

            Picker("Mode", selection: $isLogin) {
                Text("Log in").tag(true)
                Text("Register").tag(false)
            }
            .pickerStyle(.segmented)

            TextField("Email", text: $email)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)

            if !isLogin {
                TextField("Username", text: $username)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textInputAutocapitalization(.never)
                TextField("Display name", text: $displayName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }

            SecureField("Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            if let error = error {
                Text(error)
                    .foregroundColor(.red)
                    .font(.callout)
            }

            Button {
                Task { await submit() }
            } label: {
                if loading { ProgressView() } else { Text(isLogin ? "Log in" : "Create account") }
            }
            .buttonStyle(.borderedProminent)
            .tint(Color("AccentColor"))
            .disabled(loading)
            .frame(maxWidth: .infinity)

            Button("Change server", action: onBack)
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
        }
    }

    private func submit() async {
        let email = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let password = password.trimmingCharacters(in: .whitespacesAndNewlines)
        let username = username.trimmingCharacters(in: .whitespacesAndNewlines)
        let displayName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !email.isEmpty, !password.isEmpty else {
            error = "Email and password are required"
            return
        }
        if !isLogin, username.isEmpty || displayName.isEmpty {
            error = "Username and display name are required"
            return
        }
        loading = true
        error = nil
        api.baseURL = baseURL
        api.apiKey = ""
        do {
            if isLogin {
                let response = try await api.login(email: email, password: password)
                if let key = response.apiKey, let user = response.user {
                    onAuthenticated(key, user)
                } else {
                    error = response.message ?? "Login failed"
                }
            } else {
                let registerResponse = try await api.register(email: email, password: password, username: username, displayName: displayName)
                if registerResponse.message?.lowercased().contains("created") == true || registerResponse.user != nil {
                    let loginResponse = try await api.login(email: email, password: password)
                    if let key = loginResponse.apiKey, let user = loginResponse.user {
                        onAuthenticated(key, user)
                    } else {
                        error = "Account created. Please log in."
                        isLogin = true
                    }
                } else {
                    error = registerResponse.message ?? "Registration failed"
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
