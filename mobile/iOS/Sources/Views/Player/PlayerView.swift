import SwiftUI

struct PlayerView: View {
    @ObservedObject private var player = AudioPlayer.shared
    @ObservedObject private var clock = AudioPlayer.shared.clock
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var sync = SyncClient.shared
    @Environment(\.dismiss) private var dismiss

    @State private var scrub: Double?
    @State private var showQueue = false
    @State private var showDevices = false
    @State private var showLyrics = false

    var body: some View {
        Group {
            if let track = player.currentTrack {
                content(track)
            } else {
                EmptyStateView(
                    title: "Nothing playing",
                    message: "Pick a song, album or mix and it will show up here.",
                    systemImage: "music.note.list"
                )
            }
        }
        .sheet(isPresented: $showQueue) { QueueView() }
        .sheet(isPresented: $showDevices) { DevicesView() }
    }

    private func content(_ track: Track) -> some View {
        ScrollView {
            VStack(spacing: 18) {
                header

                Artwork(url: track.artworkUrl, cornerRadius: 18)
                    .aspectRatio(1, contentMode: .fit)
                    .frame(maxWidth: .infinity)
                    .shadow(radius: 20)

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(track.title).font(.title2.bold()).lineLimit(2)
                        Text(track.artistLine).font(.subheadline).foregroundColor(.secondary).lineLimit(1)
                    }
                    Spacer()
                    Button { store.toggleLike(track) } label: {
                        Image(systemName: store.isLiked(track.id) ? "heart.fill" : "heart")
                            .font(.title3)
                            .foregroundColor(store.isLiked(track.id) ? .red : .secondary)
                    }
                    .buttonStyle(.plain)
                }

                seekBar

                transport

                HStack(spacing: 24) {
                    Button { showLyrics.toggle() } label: {
                        Label(showLyrics ? "Hide lyrics" : "Lyrics", systemImage: "quote.bubble")
                    }
                    Button { showQueue = true } label: {
                        Label("Queue · \(player.queue.count)", systemImage: "list.bullet")
                    }
                }
                .font(.footnote)

                if showLyrics {
                    LyricsPanel(track: track, position: clock.position)
                }
            }
            .padding(20)
            .padding(.bottom, 40)
        }
        .background(
            LinearGradient(
                colors: [Color.accentColor.opacity(0.3), Color("Background")],
                startPoint: .top,
                endPoint: .center
            )
            .ignoresSafeArea()
        )
    }

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.down").font(.title3)
            }
            .buttonStyle(.plain)
            Spacer()
            VStack(spacing: 2) {
                Text("NOW PLAYING").font(.caption2.bold()).foregroundColor(.secondary)
                Text(activeDeviceLabel)
                    .font(.caption.bold())
                    .foregroundColor(sync.isRemoteControlling ? .accentColor : .secondary)
                    .lineLimit(1)
            }
            Spacer()
            Button { showDevices = true } label: {
                Image(systemName: "airplayaudio")
                    .font(.title3)
                    .foregroundColor(sync.isConnected ? .accentColor : .secondary)
            }
            .buttonStyle(.plain)
        }
    }

    private var activeDeviceLabel: String {
        if sync.isRemoteControlling {
            return sync.devices.first(where: { $0.id == sync.activeDeviceId })?.name ?? "Another device"
        }
        return "This device"
    }

    private var seekBar: some View {
        VStack(spacing: 4) {
            Slider(
                value: Binding(
                    get: { scrub ?? clock.position },
                    set: { scrub = $0 }
                ),
                in: 0...max(clock.duration, 1),
                onEditingChanged: { editing in
                    guard !editing, let target = scrub else { return }
                    if sync.isRemoteControlling {
                        sync.sendCommand("seek", seconds: target)
                    } else {
                        player.seek(to: target)
                    }
                    scrub = nil
                }
            )
            HStack {
                Text(formatDuration(scrub ?? clock.position))
                Spacer()
                Text(formatDuration(clock.duration))
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
    }

    private var transport: some View {
        HStack(spacing: 28) {
            Button { player.toggleShuffle() } label: {
                Image(systemName: "shuffle")
                    .foregroundColor(player.shuffle ? .accentColor : .secondary)
            }
            .buttonStyle(.plain)

            Button {
                sync.isRemoteControlling ? sync.sendCommand("previous") : player.previous()
            } label: {
                Image(systemName: "backward.fill").font(.title2)
            }
            .buttonStyle(.plain)

            Button {
                sync.isRemoteControlling ? sync.sendCommand("toggle") : player.toggle()
            } label: {
                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.title)
                    .foregroundColor(.white)
                    .frame(width: 68, height: 68)
                    .background(Color.accentColor)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Button {
                sync.isRemoteControlling ? sync.sendCommand("next") : player.next()
            } label: {
                Image(systemName: "forward.fill").font(.title2)
            }
            .buttonStyle(.plain)

            Button { player.cycleRepeat() } label: {
                Image(systemName: player.repeatMode == .one ? "repeat.1" : "repeat")
                    .foregroundColor(player.repeatMode == .off ? .secondary : .accentColor)
            }
            .buttonStyle(.plain)
        }
    }
}

/**
 The lyrics pane, matching the web player: big centred lines, the active one
 bright and the rest dimmed, tap a line to jump there, and optional
 romanization either replacing the original or sitting beneath it.
 */
private struct LyricsPanel: View {
    let track: Track
    let position: Double

    @ObservedObject private var settings = SettingsStore.shared
    @State private var lyrics: LyricsResponse?
    @State private var romanized: String?
    @State private var loaded = false
    @State private var romanizing = false

    private var syncedLines: [(time: Double, text: String)] {
        guard settings.preferSyncedLyrics, let raw = lyrics?.syncedLyrics, !raw.isEmpty else { return [] }
        return Self.parseLRC(raw)
    }

    /// Romanized text keyed by the original line's timestamp.
    private var romanizedByTime: [Double: String] {
        guard let romanized, !syncedLines.isEmpty else { return [:] }
        return Dictionary(
            Self.parseLRC(romanized).map { ($0.time, $0.text) },
            uniquingKeysWith: { first, _ in first }
        )
    }

    var body: some View {
        Group {
            if !loaded {
                ProgressView().padding()
            } else if let lyrics, lyrics.hasAnything {
                if syncedLines.isEmpty {
                    plainView(lyrics.plainLyrics ?? lyrics.syncedLyrics ?? "")
                } else {
                    syncedView(syncedLines)
                }
            } else {
                Text("No lyrics found for this track.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            if romanizing {
                Text("Romanizing…").font(.caption).foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .task(id: track.id) {
            loaded = false
            romanized = nil
            lyrics = try? await MusicyAPI.shared.getLyrics(trackId: track.id)
            loaded = true
            await loadRomanization()
        }
        .task(id: romanizeKey) { await loadRomanization() }
    }

    private var romanizeKey: String {
        "\(track.id)-\(settings.autoRomanizeLyrics)-\(settings.romanizeLanguage)"
    }

    private func loadRomanization() async {
        guard settings.autoRomanizeLyrics, lyrics?.hasAnything == true else {
            romanized = nil
            return
        }
        romanizing = true
        let mode = syncedLines.isEmpty ? "plain" : "synced"
        let language = settings.romanizeLanguage == "auto" ? nil : settings.romanizeLanguage
        romanized = try? await MusicyAPI.shared.romanizeLyrics(
            trackId: track.id,
            mode: mode,
            language: language
        )
        romanizing = false
    }

    private func syncedView(_ lines: [(time: Double, text: String)]) -> some View {
        let activeIndex = lines.lastIndex(where: { $0.time <= position }) ?? 0
        let map = romanizedByTime
        return ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                        let romanizedText = map[line.time].flatMap { $0 == line.text ? nil : $0 }
                        Button {
                            AudioPlayer.shared.seek(to: line.time)
                        } label: {
                            VStack(spacing: 3) {
                                Text(
                                    romanizedText != nil && !settings.showRomanizationAlongside
                                        ? romanizedText!
                                        : (line.text.isEmpty ? "♪" : line.text)
                                )
                                .font(index == activeIndex ? .title3.bold() : .headline)
                                .foregroundColor(index == activeIndex ? .primary : .secondary.opacity(0.55))
                                if let romanizedText, settings.showRomanizationAlongside {
                                    Text(romanizedText)
                                        .font(.subheadline.italic())
                                        .foregroundColor(.secondary.opacity(index == activeIndex ? 0.9 : 0.4))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .multilineTextAlignment(.center)
                        }
                        .buttonStyle(.plain)
                        .id(index)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .frame(height: 300)
            .onChange(of: activeIndex) { _, newValue in
                if settings.reducedMotion {
                    proxy.scrollTo(newValue, anchor: .center)
                } else {
                    withAnimation { proxy.scrollTo(newValue, anchor: .center) }
                }
            }
        }
    }

    private func plainView(_ original: String) -> some View {
        let body = romanized.flatMap { $0.isEmpty || $0 == original ? nil : $0 }
        return ScrollView {
            VStack(spacing: 16) {
                Text(body != nil && !settings.showRomanizationAlongside ? body! : original)
                    .font(.body)
                    .multilineTextAlignment(.center)
                if let body, settings.showRomanizationAlongside {
                    Text(body)
                        .font(.subheadline.italic())
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .frame(height: 300)
    }

    /// Parses `[mm:ss.xx] text` lines out of an LRC payload.
    static func parseLRC(_ raw: String) -> [(time: Double, text: String)] {
        guard let regex = try? NSRegularExpression(pattern: #"\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]"#) else { return [] }
        var result: [(time: Double, text: String)] = []
        for line in raw.components(separatedBy: .newlines) {
            let range = NSRange(line.startIndex..<line.endIndex, in: line)
            guard let match = regex.firstMatch(in: line, range: range),
                  let minuteRange = Range(match.range(at: 1), in: line),
                  let secondRange = Range(match.range(at: 2), in: line),
                  let minutes = Double(line[minuteRange]),
                  let seconds = Double(line[secondRange]) else { continue }

            var fraction = 0.0
            if let fractionRange = Range(match.range(at: 3), in: line), let value = Double(line[fractionRange]) {
                fraction = value / pow(10, Double(line[fractionRange].count))
            }

            guard let matchRange = Range(match.range, in: line) else { continue }
            let text = String(line[matchRange.upperBound...]).trimmingCharacters(in: .whitespaces)
            result.append((time: minutes * 60 + seconds + fraction, text: text))
        }
        return result.sorted { $0.time < $1.time }
    }
}
