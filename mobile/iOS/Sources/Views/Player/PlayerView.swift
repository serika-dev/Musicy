import SwiftUI

struct PlayerView: View {
    @ObservedObject private var player = AudioPlayer.shared
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
                    LyricsPanel(track: track, position: player.position)
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
                    get: { scrub ?? player.position },
                    set: { scrub = $0 }
                ),
                in: 0...max(player.duration, 1),
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
                Text(formatDuration(scrub ?? player.position))
                Spacer()
                Text(formatDuration(player.duration))
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

/// Synced lyrics when the server has them, plain text otherwise — the same
/// LRCLib data the web player renders.
private struct LyricsPanel: View {
    let track: Track
    let position: Double

    @State private var lyrics: LyricsResponse?
    @State private var loaded = false

    var body: some View {
        Group {
            if !loaded {
                ProgressView().padding()
            } else if let lyrics, lyrics.hasAnything {
                if let synced = lyrics.syncedLyrics, !synced.isEmpty {
                    syncedView(Self.parseLRC(synced))
                } else {
                    Text(lyrics.plainLyrics ?? "")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            } else {
                Text("No lyrics found for this track.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .task(id: track.id) {
            loaded = false
            lyrics = try? await MusicyAPI.shared.getLyrics(trackId: track.id)
            loaded = true
        }
    }

    private func syncedView(_ lines: [(time: Double, text: String)]) -> some View {
        let activeIndex = lines.lastIndex(where: { $0.time <= position }) ?? 0
        return ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                        Text(line.text.isEmpty ? "♪" : line.text)
                            .font(.headline)
                            .fontWeight(index == activeIndex ? .bold : .regular)
                            .foregroundColor(index == activeIndex ? .primary : .secondary)
                            .multilineTextAlignment(.center)
                            .id(index)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .frame(height: 260)
            .onChange(of: activeIndex) { _, newValue in
                withAnimation { proxy.scrollTo(newValue, anchor: .center) }
            }
        }
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
