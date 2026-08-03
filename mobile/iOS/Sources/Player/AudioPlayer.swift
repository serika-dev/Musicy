import AVFoundation
import Combine
import MediaPlayer

class AudioPlayer: ObservableObject {
    static let shared = AudioPlayer()
    let player = AVPlayer()

    @Published var isPlaying = false
    @Published var currentTrack: Track?
    @Published var queue: [Track] = []

    private var observer: Any?

    init() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.allowAirPlay, .allowBluetooth])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }

        observer = player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            self?.isPlaying = player.timeControlStatus == .playing
        }

        setupRemoteCommands()
    }

    private func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            self?.player.play()
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.player.pause()
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.next()
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.previous()
            return .success
        }
    }

    func play(track: Track, tracks: [Track] = []) {
        guard let urlString = track.filePath, let url = URL(string: urlString) else { return }
        let item = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: item)
        player.play()
        currentTrack = track
        queue = tracks.isEmpty ? [track] : tracks
        updateNowPlayingInfo()
    }

    func toggle() {
        if isPlaying {
            player.pause()
        } else {
            player.play()
        }
    }

    func next() {
        guard let current = currentTrack, let index = queue.firstIndex(where: { $0.id == current.id }), index < queue.count - 1 else { return }
        play(track: queue[index + 1], tracks: queue)
    }

    func previous() {
        guard let current = currentTrack, let index = queue.firstIndex(where: { $0.id == current.id }), index > 0 else { return }
        play(track: queue[index - 1], tracks: queue)
    }

    private func updateNowPlayingInfo() {
        var info = [String: Any]()
        info[MPMediaItemPropertyTitle] = currentTrack?.title
        info[MPMediaItemPropertyArtist] = currentTrack?.artist?.name
        info[MPMediaItemPropertyAlbumTitle] = currentTrack?.album?.title
        if let duration = currentTrack?.duration {
            info[MPMediaItemPropertyPlaybackDuration] = NSNumber(value: Double(duration))
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
}
