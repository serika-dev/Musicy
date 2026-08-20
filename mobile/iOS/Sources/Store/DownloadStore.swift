import Combine
import Foundation

/// One track saved for offline playback, with enough of the record to render
/// and play it with no network at all — the phone's answer to the web app's
/// Downloads page.
struct DownloadedTrack: Codable, Identifiable {
    let track: Track
    let fileName: String
    let sizeBytes: Int64
    let downloadedAt: Double
    var quality: String?

    var id: String { track.id }
}

/// Offline library. Files land in Application Support and the index (persisted
/// as JSON next to them) records the track so downloads survive relaunches and
/// play back with the network off.
///
/// Mirrors the Android `DownloadStore`: reactive `downloadedIds`/`downloadingIds`
/// drive every download button and the Downloads screen, and `localURL` lets the
/// player prefer a local file over streaming.
///
/// Not `@MainActor`: the player reads `localURL` synchronously from its own
/// (non-isolated) load path, so the in-memory map is guarded by a lock and the
/// `@Published` state is always mutated back on the main thread.
final class DownloadStore: ObservableObject {
    static let shared = DownloadStore()

    /// Everything saved offline, newest last. Drives the Downloads screen.
    @Published private(set) var items: [DownloadedTrack] = []

    /// Track ids with a download currently in flight, for spinners/disabled UI.
    @Published private(set) var downloadingIds: Set<String> = []

    private let fileManager = FileManager.default
    private let directory: URL
    private let indexURL: URL

    /// trackId -> local file URL, kept in memory so playback never touches the
    /// index on the hot path. Guarded by [lock] for cross-thread reads.
    private var localFiles: [String: URL] = [:]
    private let lock = NSLock()

    private init() {
        let base = (try? fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )) ?? fileManager.temporaryDirectory
        directory = base.appendingPathComponent("downloads", isDirectory: true)
        indexURL = base.appendingPathComponent("downloads_index.json")
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        loadIndex()
    }

    // MARK: - Queries

    /// Ids currently available offline. A published-derived set is fine here —
    /// SwiftUI recomputes it whenever `items` changes.
    var downloadedIds: Set<String> { Set(items.map { $0.track.id }) }

    func isDownloaded(_ trackId: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return localFiles[trackId] != nil
    }

    func isDownloading(_ trackId: String) -> Bool { downloadingIds.contains(trackId) }

    func qualityOf(_ trackId: String) -> String? {
        items.first(where: { $0.track.id == trackId })?.quality
    }

    /// Local file URL when the track is available offline (and still on disk).
    /// Safe to call from the player's load path on any thread.
    func localURL(_ trackId: String) -> URL? {
        lock.lock()
        let url = localFiles[trackId]
        lock.unlock()
        guard let url, fileManager.fileExists(atPath: url.path) else { return nil }
        return url
    }

    var totalBytes: Int64 { items.reduce(0) { $0 + $1.sizeBytes } }

    private func setLocalFile(_ url: URL?, for trackId: String) {
        lock.lock()
        if let url { localFiles[trackId] = url } else { localFiles.removeValue(forKey: trackId) }
        lock.unlock()
    }

    // MARK: - Mutations

    /// Save a single track. No-op if already saved at this quality or in flight.
    @discardableResult
    func download(_ track: Track, replace: Bool = false) async -> Bool {
        let id = track.id
        let quality = SettingsStore.readsEffectiveQuality
        if isDownloaded(id), qualityOf(id) == quality, !replace { return true }
        if isDownloading(id) { return true }

        // Use the server-side download proxy to avoid CORS issues with B2/R2
        // and to respect the user's quality setting.
        let wifiOnly = SettingsStore.readsDownloadOnWifiOnly
        let net = NetworkMonitor.shared
        if wifiOnly, net.isOnline, !net.isWifi { return false }
        guard let remote = MusicyAPI.shared.downloadURL(trackId: id, quality: quality) else { return false }

        _ = await MainActor.run { self.downloadingIds.insert(id) }
        defer { Task { @MainActor in self.downloadingIds.remove(id) } }

        var request = URLRequest(url: remote)
        let key = MusicyAPI.shared.apiKey
        if !key.isEmpty {
            request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        }

        do {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 300
            config.timeoutIntervalForResource = 600
            let session = URLSession(configuration: config)
            let (tempURL, response) = try await session.download(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode >= 400 { return false }

            let dest = directory.appendingPathComponent("\(id).\(fileExtension(for: track, remote: remote))")
            try? fileManager.removeItem(at: dest)
            try fileManager.moveItem(at: tempURL, to: dest)

            let size = ((try? fileManager.attributesOfItem(atPath: dest.path)[.size]) as? NSNumber)?.int64Value ?? 0
            let entry = DownloadedTrack(
                track: track,
                fileName: dest.lastPathComponent,
                sizeBytes: size,
                downloadedAt: Date().timeIntervalSince1970,
                quality: quality
            )
            setLocalFile(dest, for: id)
            if let data = try? JSONEncoder().encode(entry) {
                try? data.write(to: directory.appendingPathComponent("\(id).json"), options: .atomic)
            }
            await MainActor.run {
                self.items.removeAll { $0.track.id == id }
                self.items.append(entry)
                self.saveIndex()
            }
            return true
        } catch {
            return false
        }
    }

    /// Save everything that isn't already offline. Runs sequentially to stay
    /// friendly to the connection and storage. Returns the number saved.
    @discardableResult
    func downloadAll(_ tracks: [Track]) async -> Int {
        var saved = 0
        let quality = SettingsStore.readsEffectiveQuality
        for track in tracks {
            let existing = qualityOf(track.id)
            if existing == quality { continue }
            if await download(track, replace: existing != nil) { saved += 1 }
        }
        return saved
    }

    @MainActor
    func remove(_ trackId: String) {
        if let url = localURL(trackId) { try? fileManager.removeItem(at: url) }
        setLocalFile(nil, for: trackId)
        items.removeAll { $0.track.id == trackId }
        saveIndex()
    }

    func toggle(_ track: Track) async {
        let quality = SettingsStore.readsEffectiveQuality
        if isDownloaded(track.id), qualityOf(track.id) == quality {
            await MainActor.run { self.remove(track.id) }
        } else {
            await download(track, replace: isDownloaded(track.id))
        }
    }

    @MainActor
    func clear() {
        for item in items {
            if let url = localURL(item.track.id) { try? fileManager.removeItem(at: url) }
        }
        lock.lock(); localFiles.removeAll(); lock.unlock()
        items.removeAll()
        saveIndex()
    }

    // MARK: - Persistence

    private func fileExtension(for track: Track, remote: URL) -> String {
        if let format = track.format?.lowercased(), !format.isEmpty { return format }
        let ext = remote.pathExtension
        return ext.isEmpty ? "mp3" : ext
    }

    private func loadIndex() {
        var byId: [String: DownloadedTrack] = [:]
        if let data = try? Data(contentsOf: indexURL),
           let decoded = try? JSONDecoder().decode([DownloadedTrack].self, from: data) {
            for entry in decoded { byId[entry.track.id] = entry }
        }

        // Recover audio files whose index entry was lost (the usual "downloads
        // vanished" report after a preference wipe).
        let files = (try? fileManager.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey],
            options: [.skipsHiddenFiles]
        )) ?? []
        for url in files where url.pathExtension.lowercased() != "json" {
            let id = url.deletingPathExtension().lastPathComponent
            let size = ((try? fileManager.attributesOfItem(atPath: url.path)[.size]) as? NSNumber)?.int64Value ?? 0
            guard size > 0 else { continue }
            setLocalFile(url, for: id)
            if byId[id] == nil {
                let sidecar = directory.appendingPathComponent("\(id).json")
                if let data = try? Data(contentsOf: sidecar),
                   let decoded = try? JSONDecoder().decode(DownloadedTrack.self, from: data) {
                    byId[id] = decoded
                } else {
                    byId[id] = DownloadedTrack(
                        track: Track.offlineStub(id: id, format: url.pathExtension),
                        fileName: url.lastPathComponent,
                        sizeBytes: size,
                        downloadedAt: Date().timeIntervalSince1970
                    )
                }
            }
        }

        let kept = byId.values.filter { localURL($0.track.id) != nil }
        items = kept.sorted { $0.downloadedAt < $1.downloadedAt }
        if kept.count != byId.count { saveIndex() }
    }

    private func saveIndex() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        try? data.write(to: indexURL, options: .atomic)
    }
}
