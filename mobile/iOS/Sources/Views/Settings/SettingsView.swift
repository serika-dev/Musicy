import SwiftUI

struct SettingsView: View {
    @ObservedObject private var api = MusicyAPI.shared
    @ObservedObject private var sync = SyncClient.shared
    @ObservedObject private var store = LibraryStore.shared

    @State private var syncEnabled = SyncClient.shared.isEnabled
    @State private var deviceName = SyncClient.shared.deviceName
    @State private var autoplay = UserDefaults.standard.object(forKey: "musicy_autoplay") as? Bool ?? true
    @State private var privateSession = UserDefaults.standard.bool(forKey: "musicy_private_session")
    @State private var preferSyncedLyrics = UserDefaults.standard.object(forKey: "musicy_synced_lyrics") as? Bool ?? true

    var body: some View {
        List {
            Section("Musicy Connect") {
                Toggle("Sync with my other devices", isOn: $syncEnabled)
                    .onChange(of: syncEnabled) { _, value in sync.isEnabled = value }

                HStack {
                    Text("Device name")
                    Spacer()
                    TextField("Device name", text: $deviceName)
                        .multilineTextAlignment(.trailing)
                        .foregroundColor(.secondary)
                        .onSubmit { sync.deviceName = deviceName }
                }

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(sync.isConnected ? "Connected" : "Not connected")
                        Text(statusDetail).font(.caption).foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Play here") { sync.claim() }
                        .disabled(!sync.isConnected)
                }
            }

            Section("Playback") {
                Toggle("Autoplay recommendations", isOn: $autoplay)
                    .onChange(of: autoplay) { _, value in
                        UserDefaults.standard.set(value, forKey: "musicy_autoplay")
                    }
                Toggle("Private session", isOn: $privateSession)
                    .onChange(of: privateSession) { _, value in
                        UserDefaults.standard.set(value, forKey: "musicy_private_session")
                    }
                Text("A private session keeps what you play out of your listening history.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Lyrics") {
                Toggle("Prefer synced lyrics", isOn: $preferSyncedLyrics)
                    .onChange(of: preferSyncedLyrics) { _, value in
                        UserDefaults.standard.set(value, forKey: "musicy_synced_lyrics")
                    }
            }

            Section("Account") {
                LabeledContent("Server", value: api.normalizedBaseURL)
                LabeledContent("Signed in as", value: store.profile?.label ?? api.userName)
                if store.profile?.role == "ADMIN" {
                    webLink("Open admin", path: "/admin")
                }
            }

            Section("About") {
                webLink("About Musicy", path: "/about")
                webLink("Support", path: "/support")
                webLink("Contact", path: "/contact")
                webLink("Privacy policy", path: "/privacy")
                webLink("Terms", path: "/terms")
                webLink("Developers", path: "/developers")
            }

            Section {
                Button("Sign out", role: .destructive) { store.signOut() }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statusDetail: String {
        if !sync.isConnected { return "Waiting for the sync stream." }
        if sync.isThisDeviceActive { return "This device is the active one." }
        if let active = sync.activeDeviceId,
           let device = sync.devices.first(where: { $0.id == active }) {
            return "Playing on \(device.name)."
        }
        return "\(sync.devices.count) device(s) online."
    }

    /// The web app's informational pages don't need native reimplementations;
    /// they open in the browser against the configured server.
    @ViewBuilder
    private func webLink(_ title: String, path: String) -> some View {
        if let url = URL(string: api.normalizedBaseURL + path) {
            Link(title, destination: url)
        }
    }
}
