import SwiftUI

/// "Up next" — the live queue, jumpable by tap and trimmable by swipe.
struct QueueView: View {
    @ObservedObject private var player = AudioPlayer.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if player.queue.isEmpty {
                    EmptyStateView(
                        title: "Nothing queued",
                        message: "Play an album or playlist to fill the queue.",
                        systemImage: "list.bullet"
                    )
                    .listRowSeparator(.hidden)
                }
                ForEach(Array(player.queue.enumerated()), id: \.offset) { index, track in
                    TrackRow(
                        track: track,
                        isCurrent: index == player.currentIndex,
                        action: { player.skip(to: index) }
                    )
                    .listRowBackground(Color.clear)
                }
                .onDelete { offsets in
                    offsets.forEach { player.removeFromQueue(at: $0) }
                }
            }
            .listStyle(.plain)
            .navigationTitle("Queue · \(player.queue.count)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

/// Musicy Connect device picker — the same hand-off the web player offers.
struct DevicesView: View {
    @ObservedObject private var sync = SyncClient.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        sync.claim()
                        dismiss()
                    } label: {
                        deviceRow(
                            name: "This device",
                            subtitle: sync.isThisDeviceActive ? "Playing here" : "Tap to play here",
                            symbol: "iphone",
                            selected: sync.isThisDeviceActive
                        )
                    }
                    .buttonStyle(.plain)

                    ForEach(sync.devices.filter { $0.id != sync.deviceId }) { device in
                        Button {
                            sync.transfer(to: device)
                            dismiss()
                        } label: {
                            deviceRow(
                                name: device.name,
                                subtitle: device.isActive == true ? "Currently playing" : "Available",
                                symbol: "desktopcomputer",
                                selected: device.id == sync.activeDeviceId
                            )
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text(sync.isConnected ? "Pick where Musicy should play" : "Not connected to the sync service")
                } footer: {
                    if sync.devices.filter({ $0.id != sync.deviceId }).isEmpty {
                        Text("No other devices online. Open Musicy in a browser to see it here.")
                    }
                }
            }
            .navigationTitle("Connect to a device")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func deviceRow(name: String, subtitle: String, symbol: String, selected: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .foregroundColor(selected ? .accentColor : .secondary)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.subheadline.bold()).foregroundColor(selected ? .accentColor : .primary)
                Text(subtitle).font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            if selected {
                Image(systemName: "checkmark").foregroundColor(.accentColor)
            }
        }
    }
}

/// Overflow menu for a track, mirroring the web context menu.
struct TrackActionsSheet: View {
    let track: Track

    @ObservedObject private var store = LibraryStore.shared
    @Environment(\.dismiss) private var dismiss
    @State private var showPlaylists = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 12) {
                        Artwork(url: track.artworkUrl, cornerRadius: 8)
                            .frame(width: 52, height: 52)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(track.title).font(.subheadline.bold()).lineLimit(1)
                            Text(track.artistLine).font(.caption).foregroundColor(.secondary).lineLimit(1)
                        }
                    }
                }

                Section {
                    Button {
                        store.toggleLike(track)
                        dismiss()
                    } label: {
                        Label(
                            store.isLiked(track.id) ? "Remove from Liked Songs" : "Add to Liked Songs",
                            systemImage: store.isLiked(track.id) ? "heart.fill" : "heart"
                        )
                    }
                    Button {
                        AudioPlayer.shared.playNext(track)
                        dismiss()
                    } label: {
                        Label("Play next", systemImage: "text.line.first.and.arrowtriangle.forward")
                    }
                    Button {
                        AudioPlayer.shared.addToQueue([track])
                        dismiss()
                    } label: {
                        Label("Add to queue", systemImage: "text.badge.plus")
                    }
                    Button {
                        showPlaylists = true
                    } label: {
                        Label("Add to playlist", systemImage: "music.note.list")
                    }
                }
            }
            .navigationTitle("Track")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showPlaylists) {
                AddToPlaylistSheet(track: track) { dismiss() }
            }
        }
        .presentationDetents([.medium])
    }
}

/// Picks (or creates) a playlist to drop a track into.
struct AddToPlaylistSheet: View {
    let track: Track
    var onFinished: () -> Void

    @ObservedObject private var store = LibraryStore.shared
    @Environment(\.dismiss) private var dismiss
    @State private var newName = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("New playlist name", text: $newName)
                        Button("Create") {
                            let name = newName.trimmingCharacters(in: .whitespaces)
                            guard !name.isEmpty else { return }
                            newName = ""
                            Task {
                                if let playlist = await store.createPlaylist(named: name) {
                                    store.addToPlaylist(playlist, track: track)
                                }
                                dismiss()
                                onFinished()
                            }
                        }
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }

                Section("Your playlists") {
                    ForEach(store.playlists) { playlist in
                        Button {
                            store.addToPlaylist(playlist, track: track)
                            dismiss()
                            onFinished()
                        } label: {
                            HStack(spacing: 12) {
                                Artwork(url: playlist.coverImageUrl, systemImage: "music.note.list", cornerRadius: 6)
                                    .frame(width: 40, height: 40)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(playlist.name).font(.subheadline)
                                    Text("\(playlist.trackCount) tracks").font(.caption).foregroundColor(.secondary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Add to playlist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
