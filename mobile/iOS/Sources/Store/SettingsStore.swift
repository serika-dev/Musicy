import Combine
import Foundation
import UIKit

/**
 Every preference the app exposes.

 Values marked *account* are mirrored to `/api/user/settings` so they follow the
 user to the web app and to a reinstall; the rest describe this specific phone
 and stay in `UserDefaults`.
 */
@MainActor
final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()

    private enum Key {
        static let syncEnabled = "musicy_sync_enabled"
        static let deviceName = "musicy_device_name"
        static let resumeOnLaunch = "musicy_resume_on_launch"
        static let wifiOnly = "musicy_wifi_only"
        static let streamCellular = "musicy_stream_cellular"
        static let dataSaver = "musicy_data_saver"
        static let offlineOnly = "musicy_offline_only"
        static let haptics = "musicy_haptics"
        static let speed = "musicy_speed"
        static let seekStep = "musicy_seek_step"

        static let autoplay = "musicy_autoplay"
        static let gapless = "musicy_gapless"
        static let privateSession = "musicy_private_session"
        static let scrobbling = "musicy_scrobbling"
        static let normalize = "musicy_normalize"
        static let volume = "musicy_volume"
        static let quality = "musicy_quality"
        static let syncedLyrics = "musicy_synced_lyrics"
        static let romanize = "musicy_romanize"
        static let romanizeLang = "musicy_romanize_lang"
        static let romanizeAlongside = "musicy_romanize_alongside"
        static let reducedMotion = "musicy_reduced_motion"
    }

    // -- this device --------------------------------------------------------
    @Published var syncEnabled: Bool { didSet { store(Key.syncEnabled, syncEnabled) } }
    @Published var deviceName: String { didSet { store(Key.deviceName, deviceName) } }
    @Published var resumeOnLaunch: Bool { didSet { store(Key.resumeOnLaunch, resumeOnLaunch) } }
    @Published var downloadOnWifiOnly: Bool { didSet { store(Key.wifiOnly, downloadOnWifiOnly) } }
    @Published var streamOnCellular: Bool { didSet { store(Key.streamCellular, streamOnCellular) } }
    @Published var dataSaver: Bool {
        didSet {
            store(Key.dataSaver, dataSaver)
            if dataSaver {
                offlineOnly = false
                audioQuality = "low"
            }
        }
    }
    @Published var offlineOnly: Bool {
        didSet {
            store(Key.offlineOnly, offlineOnly)
            if offlineOnly { dataSaver = false }
        }
    }
    @Published var hapticFeedback: Bool { didSet { store(Key.haptics, hapticFeedback) } }

    var effectiveQuality: String { dataSaver ? "low" : audioQuality }

    var playbackMode: String {
        get {
            if offlineOnly { return "offline" }
            if dataSaver { return "data_saver" }
            if audioQuality == "lossless" { return "lossless" }
            if audioQuality == "high" { return "high" }
            return "auto"
        }
        set { applyPlaybackMode(newValue) }
    }

    var shouldPlayLocalOnly: Bool {
        if offlineOnly { return true }
        let net = NetworkMonitor.shared
        if !net.isOnline { return true }
        if !streamOnCellular && net.isCellular && !net.isWifi { return true }
        return false
    }

    /// Off-main-actor reads for the HTTP layer. `SettingsStore` is `@MainActor`.
    nonisolated static var readsOfflineOnly: Bool {
        UserDefaults.standard.object(forKey: Key.offlineOnly) as? Bool ?? false
    }
    nonisolated static var readsDataSaver: Bool {
        UserDefaults.standard.object(forKey: Key.dataSaver) as? Bool ?? false
    }
    nonisolated static var readsQuality: String {
        UserDefaults.standard.string(forKey: Key.quality) ?? "auto"
    }
    nonisolated static var readsEffectiveQuality: String {
        readsDataSaver ? "low" : readsQuality
    }
    nonisolated static var readsDownloadOnWifiOnly: Bool {
        UserDefaults.standard.object(forKey: Key.wifiOnly) as? Bool ?? true
    }

    func applyPlaybackMode(_ mode: String) {
        switch mode {
        case "data_saver":
            offlineOnly = false
            dataSaver = true
        case "offline":
            dataSaver = false
            offlineOnly = true
        case "lossless":
            offlineOnly = false
            dataSaver = false
            audioQuality = "lossless"
        case "high":
            offlineOnly = false
            dataSaver = false
            audioQuality = "high"
        default:
            offlineOnly = false
            dataSaver = false
            audioQuality = "auto"
        }
    }
    @Published var playbackSpeed: Double {
        didSet {
            store(Key.speed, playbackSpeed)
            AudioPlayer.shared.setRate(Float(playbackSpeed))
        }
    }
    @Published var seekStepSeconds: Int { didSet { store(Key.seekStep, seekStepSeconds) } }

    // -- account (synced) ---------------------------------------------------
    @Published var autoplayRecommendations: Bool { didSet { sync(Key.autoplay, autoplayRecommendations) } }
    @Published var gaplessPlayback: Bool { didSet { sync(Key.gapless, gaplessPlayback) } }
    @Published var privateSession: Bool { didSet { sync(Key.privateSession, privateSession) } }
    @Published var allowScrobbling: Bool { didSet { sync(Key.scrobbling, allowScrobbling) } }
    @Published var normalizeVolume: Bool { didSet { sync(Key.normalize, normalizeVolume) } }
    @Published var defaultVolume: Double {
        didSet {
            sync(Key.volume, defaultVolume)
            AudioPlayer.shared.setVolume(Float(defaultVolume))
        }
    }
    @Published var audioQuality: String { didSet { sync(Key.quality, audioQuality) } }
    @Published var preferSyncedLyrics: Bool { didSet { sync(Key.syncedLyrics, preferSyncedLyrics) } }
    @Published var autoRomanizeLyrics: Bool { didSet { sync(Key.romanize, autoRomanizeLyrics) } }
    @Published var romanizeLanguage: String { didSet { sync(Key.romanizeLang, romanizeLanguage) } }
    @Published var showRomanizationAlongside: Bool { didSet { sync(Key.romanizeAlongside, showRomanizationAlongside) } }
    @Published var reducedMotion: Bool { didSet { sync(Key.reducedMotion, reducedMotion) } }

    private let defaults = UserDefaults.standard
    /// Suppresses persistence while the initialiser and remote pulls run.
    private var loading = true

    private init() {
        let d = UserDefaults.standard
        func bool(_ key: String, _ fallback: Bool) -> Bool { d.object(forKey: key) as? Bool ?? fallback }

        syncEnabled = bool(Key.syncEnabled, true)
        deviceName = d.string(forKey: Key.deviceName) ?? UIDevice.current.name
        resumeOnLaunch = bool(Key.resumeOnLaunch, true)
        downloadOnWifiOnly = bool(Key.wifiOnly, true)
        streamOnCellular = bool(Key.streamCellular, true)
        dataSaver = bool(Key.dataSaver, false)
        offlineOnly = bool(Key.offlineOnly, false)
        hapticFeedback = bool(Key.haptics, true)
        playbackSpeed = d.object(forKey: Key.speed) as? Double ?? 1
        seekStepSeconds = d.object(forKey: Key.seekStep) as? Int ?? 10

        autoplayRecommendations = bool(Key.autoplay, true)
        gaplessPlayback = bool(Key.gapless, true)
        privateSession = bool(Key.privateSession, false)
        allowScrobbling = bool(Key.scrobbling, true)
        normalizeVolume = bool(Key.normalize, false)
        defaultVolume = d.object(forKey: Key.volume) as? Double ?? 1
        audioQuality = d.string(forKey: Key.quality) ?? "auto"
        preferSyncedLyrics = bool(Key.syncedLyrics, true)
        autoRomanizeLyrics = bool(Key.romanize, false)
        romanizeLanguage = d.string(forKey: Key.romanizeLang) ?? "auto"
        showRomanizationAlongside = bool(Key.romanizeAlongside, false)
        reducedMotion = bool(Key.reducedMotion, false)

        loading = false
    }

    /// The slice the server knows about.
    var accountSettings: UserSettings {
        UserSettings(
            autoRomanizeLyrics: autoRomanizeLyrics,
            romanizeLanguage: romanizeLanguage,
            showRomanizationAlongside: showRomanizationAlongside,
            reducedMotion: reducedMotion,
            audioQuality: audioQuality,
            normalizeVolume: normalizeVolume,
            defaultVolume: defaultVolume,
            autoplayRecommendations: autoplayRecommendations,
            gaplessPlayback: gaplessPlayback,
            privateSession: privateSession,
            allowScrobbling: allowScrobbling
        )
    }

    /// Pulls account settings so preferences follow the user to a new install.
    func pullFromAccount() async {
        guard let remote = try? await MusicyAPI.shared.getUserSettings() else { return }
        loading = true
        autoRomanizeLyrics = remote.autoRomanizeLyrics
        romanizeLanguage = remote.romanizeLanguage
        showRomanizationAlongside = remote.showRomanizationAlongside
        reducedMotion = remote.reducedMotion
        audioQuality = remote.audioQuality
        normalizeVolume = remote.normalizeVolume
        defaultVolume = remote.defaultVolume
        autoplayRecommendations = remote.autoplayRecommendations
        gaplessPlayback = remote.gaplessPlayback
        privateSession = remote.privateSession
        allowScrobbling = remote.allowScrobbling
        loading = false
        persistAccountKeys()
    }

    func resetToDefaults() {
        loading = true
        syncEnabled = true
        resumeOnLaunch = true
        downloadOnWifiOnly = true
        streamOnCellular = true
        dataSaver = false
        offlineOnly = false
        hapticFeedback = true
        playbackSpeed = 1
        seekStepSeconds = 10
        autoplayRecommendations = true
        gaplessPlayback = true
        privateSession = false
        allowScrobbling = true
        normalizeVolume = false
        defaultVolume = 1
        audioQuality = "auto"
        preferSyncedLyrics = true
        autoRomanizeLyrics = false
        romanizeLanguage = "auto"
        showRomanizationAlongside = false
        reducedMotion = false
        loading = false
        persistAccountKeys()
        Task { try? await MusicyAPI.shared.putUserSettings(accountSettings) }
    }

    private func store(_ key: String, _ value: Any) {
        guard !loading else { return }
        defaults.set(value, forKey: key)
    }

    /// Saves locally, then mirrors the account-scoped slice upward.
    private func sync(_ key: String, _ value: Any) {
        guard !loading else { return }
        defaults.set(value, forKey: key)
        let snapshot = accountSettings
        Task { try? await MusicyAPI.shared.putUserSettings(snapshot) }
    }

    private func persistAccountKeys() {
        defaults.set(autoRomanizeLyrics, forKey: Key.romanize)
        defaults.set(romanizeLanguage, forKey: Key.romanizeLang)
        defaults.set(showRomanizationAlongside, forKey: Key.romanizeAlongside)
        defaults.set(reducedMotion, forKey: Key.reducedMotion)
        defaults.set(audioQuality, forKey: Key.quality)
        defaults.set(normalizeVolume, forKey: Key.normalize)
        defaults.set(defaultVolume, forKey: Key.volume)
        defaults.set(autoplayRecommendations, forKey: Key.autoplay)
        defaults.set(gaplessPlayback, forKey: Key.gapless)
        defaults.set(privateSession, forKey: Key.privateSession)
        defaults.set(allowScrobbling, forKey: Key.scrobbling)
        defaults.set(preferSyncedLyrics, forKey: Key.syncedLyrics)
    }
}
