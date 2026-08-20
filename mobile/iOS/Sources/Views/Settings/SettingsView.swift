import SwiftUI

struct SettingsView: View {
    @ObservedObject private var api = MusicyAPI.shared
    @ObservedObject private var sync = SyncClient.shared
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var settings = SettingsStore.shared

    @State private var deviceName = SettingsStore.shared.deviceName
    @State private var showReset = false

    var body: some View {
        List {
            Section("Musicy Connect") {
                Toggle("Sync with my other devices", isOn: $settings.syncEnabled)
                    .onChange(of: settings.syncEnabled) { _, value in sync.isEnabled = value }

                HStack {
                    Text("Device name")
                    Spacer()
                    TextField("Device name", text: $deviceName)
                        .multilineTextAlignment(.trailing)
                        .foregroundColor(.secondary)
                        .onSubmit {
                            settings.deviceName = deviceName
                            sync.deviceName = deviceName
                        }
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

            Section("Listening mode") {
                Picker("Playback", selection: Binding(
                    get: { settings.playbackMode },
                    set: { settings.applyPlaybackMode($0) }
                )) {
                    Text("Data saver").tag("data_saver")
                    Text("Auto").tag("auto")
                    Text("High").tag("high")
                    Text("Lossless").tag("lossless")
                    Text("Offline").tag("offline")
                }
                Text(modeCaption)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Playback") {
                Toggle("Autoplay recommendations", isOn: $settings.autoplayRecommendations)
                Toggle("Gapless playback", isOn: $settings.gaplessPlayback)
                Toggle("Normalize volume", isOn: $settings.normalizeVolume)
                Toggle("Resume where I left off", isOn: $settings.resumeOnLaunch)

                Picker("Playback speed", selection: $settings.playbackSpeed) {
                    Text("0.75×").tag(0.75)
                    Text("1×").tag(1.0)
                    Text("1.25×").tag(1.25)
                    Text("1.5×").tag(1.5)
                    Text("2×").tag(2.0)
                }

                Picker("Skip button jump", selection: $settings.seekStepSeconds) {
                    Text("5s").tag(5)
                    Text("10s").tag(10)
                    Text("15s").tag(15)
                    Text("30s").tag(30)
                }

                Picker("Audio quality", selection: $settings.audioQuality) {
                    Text("Auto").tag("auto")
                    Text("Low").tag("low")
                    Text("Medium").tag("medium")
                    Text("High").tag("high")
                    Text("Lossless").tag("lossless")
                }

                VStack(alignment: .leading) {
                    HStack {
                        Text("Default volume")
                        Spacer()
                        Text("\(Int(settings.defaultVolume * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Slider(value: $settings.defaultVolume, in: 0...1)
                }
            }

            Section("Lyrics") {
                Toggle("Prefer synced lyrics", isOn: $settings.preferSyncedLyrics)
                Toggle("Romanize lyrics", isOn: $settings.autoRomanizeLyrics)
                if settings.autoRomanizeLyrics {
                    Toggle("Show original alongside", isOn: $settings.showRomanizationAlongside)
                    Picker("Romanize language", selection: $settings.romanizeLanguage) {
                        Text("Auto").tag("auto")
                        Text("Japanese").tag("ja")
                        Text("Korean").tag("ko")
                        Text("Hindi").tag("hi")
                    }
                }
                Text("Japanese, Korean and Hindi lyrics are converted to the Latin alphabet.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Privacy") {
                Toggle("Private session", isOn: $settings.privateSession)
                Toggle("Allow scrobbling", isOn: $settings.allowScrobbling)
                Text("A private session keeps what you play out of your listening history.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Appearance & feedback") {
                Toggle("Reduced motion", isOn: $settings.reducedMotion)
                Toggle("Haptic feedback", isOn: $settings.hapticFeedback)
            }

            Section("Storage & offline") {
                Toggle("Offline mode", isOn: $settings.offlineOnly)
                Toggle("Data saver", isOn: $settings.dataSaver)
                Toggle("Stream on mobile data", isOn: $settings.streamOnCellular)
                Toggle("Download on Wi-Fi only", isOn: $settings.downloadOnWifiOnly)
                Button("Save library for offline") {
                    Task { await store.syncLibraryForOffline() }
                }
            }

            Section("Account") {
                LabeledContent("Server", value: api.normalizedBaseURL)
                LabeledContent("Signed in as", value: store.profile?.label ?? api.userName)
                if store.profile?.role == "ADMIN" {
                    webLink("Open admin", path: "/admin")
                }
                Text("Playback, lyrics and privacy settings are saved to your account, so they follow you to the web app and survive reinstalling Musicy.")
                    .font(.caption)
                    .foregroundColor(.secondary)
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
                Button("Reset settings") { showReset = true }
                Button("Sign out", role: .destructive) { store.signOut() }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .task { await settings.pullFromAccount() }
        .alert("Reset settings?", isPresented: $showReset) {
            Button("Reset", role: .destructive) { settings.resetToDefaults() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Everything goes back to defaults. Your sign-in is kept.")
        }
    }

    private var modeCaption: String {
        switch settings.playbackMode {
        case "offline": return "Only downloaded tracks play. The rest of the app uses your saved library."
        case "data_saver": return "Streams the smallest files and skips extra artwork on mobile data."
        case "lossless": return "Streams and downloads original FLAC when the server has it."
        case "high": return "High-bitrate audio. Uses more data than Auto."
        default: return "Picks a sensible stream for your connection."
        }
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
