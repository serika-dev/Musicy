import Combine
import Foundation
import UIKit

/// Musicy Connect for iOS — joins the same device bus the web app uses, so
/// playback can be handed between a browser tab and the phone.
///
/// The transport is the server's SSE stream read with `URLSession.bytes`;
/// commands go back over `/api/sync/publish`.
@MainActor
final class SyncClient: ObservableObject {
    static let shared = SyncClient()

    @Published private(set) var devices: [SyncDevice] = []
    @Published private(set) var activeDeviceId: String?
    @Published private(set) var isConnected = false

    /// Stable per-install id. Other devices see this in the picker.
    let deviceId: String = {
        let key = "musicy_device_id"
        if let existing = UserDefaults.standard.string(forKey: key), !existing.isEmpty { return existing }
        let suffix = UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(16)
        let generated = "dev_ios_" + String(suffix)
        UserDefaults.standard.set(generated, forKey: key)
        return generated
    }()

    var deviceName: String {
        get { UserDefaults.standard.string(forKey: "musicy_device_name") ?? UIDevice.current.name }
        set { UserDefaults.standard.set(newValue, forKey: "musicy_device_name") }
    }

    var isEnabled: Bool {
        get { (UserDefaults.standard.object(forKey: "musicy_sync_enabled") as? Bool) ?? true }
        set {
            UserDefaults.standard.set(newValue, forKey: "musicy_sync_enabled")
            if newValue { start() } else { stop() }
        }
    }

    var isThisDeviceActive: Bool { activeDeviceId != nil && activeDeviceId == deviceId }

    /// True when another device holds playback and we act as a remote.
    var isRemoteControlling: Bool { activeDeviceId != nil && activeDeviceId != deviceId }

    private var streamTask: Task<Void, Never>?
    private var heartbeatTask: Task<Void, Never>?
    private var remoteState: SyncStateEvent.Payload?

    private init() {}

    func start() {
        guard MusicyAPI.shared.isAuthenticated, isEnabled, streamTask == nil else { return }

        AudioPlayer.shared.onStateChanged = { [weak self] in
            Task { @MainActor in self?.publishStateIfActive() }
        }

        streamTask = Task { [weak self] in
            var attempt = 0
            while !Task.isCancelled {
                guard let self else { return }
                do {
                    try await self.openStream()
                    attempt = 0
                } catch {
                    self.isConnected = false
                }
                if Task.isCancelled { return }
                // Exponential backoff with jitter, capped, matching the web client.
                let delay = min(15.0, pow(2.0, Double(min(attempt, 4))))
                attempt += 1
                try? await Task.sleep(nanoseconds: UInt64((delay + Double.random(in: 0...0.5)) * 1_000_000_000))
            }
        }

        heartbeatTask = Task { [weak self] in
            while !Task.isCancelled {
                let playing = self?.isThisDeviceActive == true && AudioPlayer.shared.isPlaying
                try? await Task.sleep(nanoseconds: playing ? 1_000_000_000 : 3_000_000_000)
                self?.publishStateIfActive()
            }
        }

        Task {
            if let list = try? await MusicyAPI.shared.getDevices() {
                devices = list
                if let active = list.first(where: { $0.isActive == true }) { activeDeviceId = active.id }
            }
        }
    }

    func stop() {
        streamTask?.cancel()
        heartbeatTask?.cancel()
        streamTask = nil
        heartbeatTask = nil
        isConnected = false
    }

    private func openStream() async throws {
        let name = deviceName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "iPhone"
        let path = "api/sync/stream?deviceId=\(deviceId)&name=\(name)"
        guard var request = MusicyAPI.shared.makeRequest(path: path) else { throw APIError.invalidURL }
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = .infinity

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode < 400 else {
            throw APIError.server((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        isConnected = true

        var event = "message"
        var data = ""
        for try await line in bytes.lines {
            if line.isEmpty {
                if !data.isEmpty { handle(event: event, payload: data) }
                event = "message"
                data = ""
            } else if line.hasPrefix(":") {
                continue // heartbeat comment
            } else if line.hasPrefix("event:") {
                event = String(line.dropFirst(6)).trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("data:") {
                data += String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            }
        }
        isConnected = false
    }

    private func handle(event: String, payload: String) {
        guard let data = payload.data(using: .utf8) else { return }
        let decoder = JSONDecoder()

        switch event {
        case "device-list":
            guard let parsed = try? decoder.decode(DeviceListEvent.self, from: data) else { return }
            devices = parsed.payload.devices
            if let active = parsed.payload.devices.first(where: { $0.isActive == true }) {
                activeDeviceId = active.id
            }

        case "state":
            guard let parsed = try? decoder.decode(SyncStateEvent.self, from: data),
                  parsed.fromDeviceId != deviceId else { return }
            remoteState = parsed.payload
            if let active = parsed.payload.activeDeviceId { activeDeviceId = active }

        case "claim":
            guard let parsed = try? decoder.decode(SyncClaimEvent.self, from: data),
                  let from = parsed.fromDeviceId else { return }
            activeDeviceId = from
            // Another device took over: stop our audio immediately.
            if from != deviceId { AudioPlayer.shared.player.pause() }

        case "command":
            guard let parsed = try? decoder.decode(SyncCommandEvent.self, from: data) else { return }
            let target = parsed.targetDeviceId
            let forUs = target == nil || target == deviceId
            // Untargeted commands only apply to whoever holds playback.
            guard forUs, target != nil || isThisDeviceActive else { return }
            apply(parsed.payload)

        case "disconnect":
            guard let parsed = try? decoder.decode(SyncClaimEvent.self, from: data),
                  let gone = parsed.fromDeviceId else { return }
            devices.removeAll { $0.id == gone }
            if activeDeviceId == gone { activeDeviceId = nil }

        default:
            break
        }
    }

    private func apply(_ command: SyncCommandEvent.Payload) {
        let player = AudioPlayer.shared
        switch command.action {
        case "play": player.player.play()
        case "pause": player.player.pause()
        case "toggle": player.toggle()
        case "next": player.next()
        case "previous": player.previous()
        case "seek": if let seconds = command.seconds { player.seek(to: seconds) }
        case "setVolume": if let volume = command.volume { player.setVolume(Float(volume)) }
        case "claim":
            claim()
            applyRemoteState()
        case "playTrack":
            if let queued = command.queue, !queued.isEmpty {
                let start = command.currentIndex
                    ?? queued.firstIndex(where: { $0.id == command.trackId })
                    ?? 0
                player.play(tracks: queued, startAt: start)
            } else if let trackId = command.trackId {
                Task {
                    if let track = try? await MusicyAPI.shared.getTrack(id: trackId) {
                        player.play(tracks: [track])
                    }
                }
            }
        case "shuffle":
            player.toggleShuffle()
        case "setRepeat":
            switch command.mode {
            case "one", "track": player.repeatMode = .one
            case "all", "playlist": player.repeatMode = .all
            default: player.repeatMode = .off
            }
        default:
            break
        }
    }

    // MARK: - Outbound

    private func applyRemoteState() {
        let player = AudioPlayer.shared
        guard let state = remoteState else {
            player.player.play()
            return
        }
        if let queue = state.queue, !queue.isEmpty {
            let start = state.currentIndex
                ?? queue.firstIndex(where: { $0.id == state.trackId })
                ?? 0
            player.play(tracks: queue, startAt: start)
            if let time = state.currentTime, time > 1 { player.seek(to: time) }
        } else if let track = state.currentTrack {
            player.play(tracks: [track])
            if let time = state.currentTime, time > 1 { player.seek(to: time) }
        }
        if let shuffle = state.shuffle { player.shuffle = shuffle }
        switch state.repeatMode {
        case "one", "track": player.repeatMode = .one
        case "all", "playlist": player.repeatMode = .all
        case "off": player.repeatMode = .off
        default: break
        }
        if state.isPlaying == false { player.player.pause() }
    }

    /// Announces this device as the one playing audio.
    func claim() {
        activeDeviceId = deviceId
        publish([
            "type": "claim",
            "fromDeviceId": deviceId,
            "payload": ["deviceName": deviceName]
        ])
    }

    /// Asks another device to take over playback.
    func transfer(to device: SyncDevice) {
        publishStateIfActive()
        publish([
            "type": "command",
            "fromDeviceId": deviceId,
            "targetDeviceId": device.id,
            "payload": ["action": "claim"]
        ])
    }

    /// Sends a transport command to whichever device is currently playing.
    func sendCommand(_ action: String, seconds: Double? = nil, mode: String? = nil) {
        var payload: [String: Any] = ["action": action]
        if let seconds { payload["seconds"] = seconds }
        if let mode { payload["mode"] = mode }
        var body: [String: Any] = [
            "type": "command",
            "fromDeviceId": deviceId,
            "payload": payload
        ]
        if let active = activeDeviceId, active != deviceId { body["targetDeviceId"] = active }
        publish(body)
    }

    private func publishStateIfActive() {
        guard isEnabled, isThisDeviceActive else { return }
        let player = AudioPlayer.shared
        guard let track = player.currentTrack,
              let trackData = try? JSONEncoder().encode(track),
              let trackJSON = try? JSONSerialization.jsonObject(with: trackData) else { return }

        let queueJSON = (try? JSONEncoder().encode(Array(player.queue.prefix(80)))).flatMap {
            try? JSONSerialization.jsonObject(with: $0)
        } ?? []
        let repeatMode: String = {
            switch player.repeatMode {
            case .one: return "track"
            case .all: return "playlist"
            case .off: return "off"
            }
        }()
        publish([
            "type": "state",
            "fromDeviceId": deviceId,
            "payload": [
                "trackId": track.id,
                "currentTrack": trackJSON,
                "isPlaying": player.isPlaying,
                "currentTime": player.position,
                "duration": player.duration,
                "queue": queueJSON,
                "currentIndex": player.currentIndex,
                "shuffle": player.shuffle,
                "repeatMode": repeatMode,
                "activeDeviceId": deviceId
            ] as [String: Any]
        ])
    }

    private func publish(_ body: [String: Any]) {
        Task { await MusicyAPI.shared.publishSync(body) }
    }
}
