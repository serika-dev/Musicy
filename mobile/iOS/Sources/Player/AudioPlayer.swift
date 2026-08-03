import AVFoundation
import Combine
import MediaPlayer
import UIKit

enum RepeatMode {
    case off, all, one
}

/// The moving playhead, published separately from `AudioPlayer`.
///
/// Folding it into the player meant every view observing playback redrew twice
/// a second, which is what made scrolling feel sticky while music was playing.
final class PlaybackClock: ObservableObject {
    @Published fileprivate(set) var position: Double = 0
    @Published fileprivate(set) var duration: Double = 0

    var progress: Double {
        duration > 0 ? min(max(position / duration, 0), 1) : 0
    }
}

/// The app's single audio engine. The SwiftUI player, the lock screen, CarPlay
/// and Musicy Connect all drive this one object so they never disagree about
/// what is playing.
///
/// Everything runs on the main queue: `AVPlayer` callbacks are hopped there so
/// the `@Published` values are always safe for SwiftUI to read.
final class AudioPlayer: ObservableObject {
    static let shared = AudioPlayer()

    let player = AVPlayer()

    @Published private(set) var currentTrack: Track?
    @Published private(set) var queue: [Track] = []
    @Published private(set) var currentIndex: Int = 0
    @Published private(set) var isPlaying = false
    /// Read `clock.position` in views; only the scrubber and lyrics need it.
    let clock = PlaybackClock()

    var position: Double { clock.position }
    var duration: Double { clock.duration }
    @Published var shuffle = false
    @Published var repeatMode: RepeatMode = .off

    /// Called whenever transport state changes, so the sync client can
    /// broadcast without this type knowing anything about the network.
    var onStateChanged: (() -> Void)?

    private var statusObserver: NSKeyValueObservation?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private var rate: Float = 1
    private var listenStartedAt: Date?
    private var listenAccumulated: TimeInterval = 0

    private init() {
        configureSession()
        observePlayer()
        setupRemoteCommands()
    }

    private func configureSession() {
        do {
            // A2DP routing comes with .playback already; .allowBluetooth only
            // adds the mono HFP route, which is wrong for music.
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.allowAirPlay]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }
    }

    private func observePlayer() {
        statusObserver = player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                let playing = player.timeControlStatus == .playing
                if playing { self.resumeListenTimer() } else { self.pauseListenTimer() }
                self.isPlaying = playing
                self.updateNowPlayingInfo()
                self.onStateChanged?()
            }
        }

        timeObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.5, preferredTimescale: 600),
            queue: .main
        ) { [weak self] time in
            DispatchQueue.main.async {
                guard let self else { return }
                self.clock.position = time.seconds.isFinite ? time.seconds : 0
                if let itemDuration = self.player.currentItem?.duration.seconds, itemDuration.isFinite {
                    self.clock.duration = itemDuration
                }
            }
        }

        // Without this the queue stalls after every song.
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            DispatchQueue.main.async { self?.handleTrackFinished() }
        }
    }

    private func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { self?.player.play() }
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { self?.player.pause() }
            return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { self?.toggle() }
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { self?.next() }
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { self?.previous() }
            return .success
        }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            DispatchQueue.main.async { self?.seek(to: event.positionTime) }
            return .success
        }
    }

    // MARK: - Transport

    func play(tracks: [Track], startAt index: Int = 0) {
        let playable = tracks.filter { !($0.filePath ?? "").isEmpty }
        guard !playable.isEmpty else { return }
        let requestedId = tracks.indices.contains(index) ? tracks[index].id : playable[0].id
        queue = shuffle ? playable.shuffled() : playable
        currentIndex = queue.firstIndex(where: { $0.id == requestedId }) ?? 0
        loadCurrent(autoPlay: true)
    }

    func play(track: Track, tracks: [Track] = []) {
        play(tracks: tracks.isEmpty ? [track] : tracks,
             startAt: tracks.firstIndex(where: { $0.id == track.id }) ?? 0)
    }

    func playNext(_ track: Track) {
        guard !queue.isEmpty else {
            play(tracks: [track])
            return
        }
        queue.insert(track, at: min(currentIndex + 1, queue.count))
        onStateChanged?()
    }

    func addToQueue(_ tracks: [Track]) {
        let playable = tracks.filter { !($0.filePath ?? "").isEmpty }
        guard !playable.isEmpty else { return }
        if queue.isEmpty {
            play(tracks: playable)
        } else {
            queue.append(contentsOf: playable)
            onStateChanged?()
        }
    }

    func removeFromQueue(at index: Int) {
        guard queue.indices.contains(index), index != currentIndex else { return }
        queue.remove(at: index)
        if index < currentIndex { currentIndex -= 1 }
        onStateChanged?()
    }

    func skip(to index: Int) {
        guard queue.indices.contains(index) else { return }
        currentIndex = index
        loadCurrent(autoPlay: true)
    }

    func toggle() {
        if isPlaying {
            player.pause()
        } else {
            player.play()
            if rate != 1 { player.rate = rate }
        }
    }

    func next() {
        guard !queue.isEmpty else { return }
        if currentIndex + 1 < queue.count {
            currentIndex += 1
            loadCurrent(autoPlay: true)
        } else if repeatMode == .all {
            currentIndex = 0
            loadCurrent(autoPlay: true)
        }
    }

    /// Restarts the track first, like every other music app's back button.
    func previous() {
        if position > 3 {
            seek(to: 0)
            return
        }
        guard currentIndex > 0 else {
            seek(to: 0)
            return
        }
        currentIndex -= 1
        loadCurrent(autoPlay: true)
    }

    func seek(to seconds: Double) {
        player.seek(to: CMTime(seconds: max(0, seconds), preferredTimescale: 600))
        clock.position = max(0, seconds)
        updateNowPlayingInfo()
    }

    func setVolume(_ value: Float) {
        player.volume = min(max(value, 0), 1)
    }

    func setRate(_ value: Float) {
        rate = min(max(value, 0.5), 2)
        if isPlaying { player.rate = rate }
    }

    /// Jumps by the user's configured step, used by the ±N second buttons.
    func seekBy(_ seconds: Double) {
        seek(to: max(0, position + seconds))
    }

    func toggleShuffle() {
        shuffle.toggle()
        guard !queue.isEmpty, let current = currentTrack else { return }
        if shuffle {
            var rest = queue.filter { $0.id != current.id }
            rest.shuffle()
            queue = [current] + rest
        }
        currentIndex = queue.firstIndex(where: { $0.id == current.id }) ?? 0
        onStateChanged?()
    }

    func cycleRepeat() {
        switch repeatMode {
        case .off: repeatMode = .all
        case .all: repeatMode = .one
        case .one: repeatMode = .off
        }
    }

    func stop() {
        player.pause()
        player.replaceCurrentItem(with: nil)
        flushListen()
        queue = []
        currentTrack = nil
        currentIndex = 0
        isPlaying = false
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        onStateChanged?()
    }

    // MARK: - Internals

    private func loadCurrent(autoPlay: Bool) {
        guard queue.indices.contains(currentIndex) else { return }
        flushListen()
        let track = queue[currentIndex]
        guard let url = MusicyAPI.shared.absoluteURL(track.filePath) else { return }

        let item = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: item)
        currentTrack = track
        clock.position = 0
        clock.duration = Double(track.duration ?? 0)
        listenAccumulated = 0
        listenStartedAt = nil
        if autoPlay {
            player.play()
            if rate != 1 { player.rate = rate }
        }
        updateNowPlayingInfo()
        onStateChanged?()
    }

    private func handleTrackFinished() {
        flushListen()
        if repeatMode == .one {
            seek(to: 0)
            player.play()
            return
        }
        next()
    }

    private func resumeListenTimer() {
        if listenStartedAt == nil { listenStartedAt = Date() }
    }

    private func pauseListenTimer() {
        if let started = listenStartedAt {
            listenAccumulated += Date().timeIntervalSince(started)
            listenStartedAt = nil
        }
    }

    /// Scrobbles the finished track with how long it was actually heard.
    private func flushListen() {
        pauseListenTimer()
        let seconds = Int(listenAccumulated)
        let trackId = currentTrack?.id
        listenAccumulated = 0
        guard let trackId, seconds >= 5 else { return }
        Task { try? await MusicyAPI.shared.recordPlay(trackId: trackId, seconds: seconds) }
    }

    private func updateNowPlayingInfo() {
        guard let track = currentTrack else { return }
        var info = [String: Any]()
        info[MPMediaItemPropertyTitle] = track.title
        info[MPMediaItemPropertyArtist] = track.artistLine
        info[MPMediaItemPropertyAlbumTitle] = track.album?.title
        info[MPMediaItemPropertyPlaybackDuration] = NSNumber(value: duration > 0 ? duration : Double(track.duration ?? 0))
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = NSNumber(value: position)
        info[MPNowPlayingInfoPropertyPlaybackRate] = NSNumber(value: isPlaying ? 1.0 : 0.0)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        loadArtwork(for: track)
    }

    private var artworkTrackId: String?

    private func loadArtwork(for track: Track) {
        guard artworkTrackId != track.id, let url = MusicyAPI.shared.absoluteURL(track.artworkUrl) else { return }
        artworkTrackId = track.id
        Task {
            guard let (data, _) = try? await URLSession.shared.data(from: url),
                  let image = UIImage(data: data) else { return }
            await MainActor.run {
                guard self.currentTrack?.id == track.id else { return }
                var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
            }
        }
    }
}
