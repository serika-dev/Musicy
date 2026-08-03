import SwiftUI

struct SetupView: View {
    @AppStorage("musicy_base_url") private var baseURL = "https://music.serika.dev"
    @AppStorage("musicy_api_key") private var apiKey = ""
    @State private var testing = false
    @State private var testResult: String?

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            VStack(spacing: 20) {
                Spacer()
                Image(systemName: "music.note")
                    .font(.system(size: 72))
                    .foregroundColor(Color("AccentColor"))
                Text("Welcome to Musicy")
                    .font(.largeTitle.bold())
                Text("Enter your Musicy server to get started.")
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Server URL")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("https://music.serika.dev", text: $baseURL)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    Text("API Key")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    SecureField("Optional – required for private libraries", text: $apiKey)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    Text("Self-hosted? Use your own domain and create an API key in web Settings.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                if let result = testResult {
                    Text(result)
                        .font(.caption)
                        .foregroundColor(result.hasPrefix("OK") ? .green : .red)
                }

                Button {
                    Task { await test() }
                } label: {
                    if testing {
                        ProgressView()
                    } else {
                        Text("Test connection")
                    }
                }
                .disabled(testing || baseURL.isEmpty)
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentColor"))

                Button("Continue") {
                    var normalized = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                    if normalized.isEmpty { normalized = "https://music.serika.dev" }
                    baseURL = normalized
                }
                .disabled(baseURL.isEmpty)
                .buttonStyle(.borderedProminent)

                Spacer()
            }
            .padding()
        }
    }

    private func test() async {
        testing = true
        let api = MusicyAPI.shared
        api.baseURL = baseURL
        api.apiKey = apiKey
        do {
            _ = try await api.getPublicSettings()
            testResult = "OK: connected to \(api.baseURL)"
        } catch {
            testResult = "Error: \(error.localizedDescription)"
        }
        testing = false
    }
}
