import SwiftUI

private enum LibraryTab: String, CaseIterable, Identifiable {
    case playlists = "Playlists"
    case artists = "Artists"
    case albums = "Albums"
    case songs = "Songs"

    var id: String { rawValue }
}

struct LibraryView: View {
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var tab: LibraryTab = .playlists
    @State private var showCreate = false
    @State private var newPlaylistName = ""
    @State private var actionTrack: Track?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(LibraryTab.allCases) { option in
                                Button { tab = option } label: {
                                    Text(option.rawValue)
                                        .font(.subheadline.bold())
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(option == tab ? Color.accentColor : Color("Surface"))
                                        .foregroundColor(option == tab ? .white : .primary)
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }

                    pinnedRow(
                        "Liked Songs",
                        subtitle: "\(store.likedSongs.count) songs",
                        symbol: "heart.fill",
                        colors: [.accentColor, Color(red: 0.86, green: 0.15, blue: 0.47)],
                        route: .liked
                    )
                    pinnedRow(
                        "Recently played",
                        subtitle: "\(store.recentlyPlayed.count) songs",
                        symbol: "clock.arrow.circlepath",
                        colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.05, green: 0.65, blue: 0.91)],
                        route: .collection(.recent)
                    )

                    Divider().padding(.vertical, 6)

                    switch tab {
                    case .playlists:
                        if store.playlists.isEmpty {
                            EmptyStateView(
                                title: "No playlists yet",
                                message: "Create one and start collecting the songs you love.",
                                systemImage: "music.note.list"
                            )
                        }
                        ForEach(store.playlists) { playlist in
                            NavigationLink(value: Route.playlist(playlist.id)) {
                                row(playlist.name, "Playlist · \(playlist.trackCount) tracks", playlist.coverImageUrl, systemImage: "music.note.list")
                            }
                            .buttonStyle(.plain)
                        }

                    case .artists:
                        if store.followedArtists.isEmpty {
                            EmptyStateView(
                                title: "You're not following anyone",
                                message: "Follow artists to see their new releases here.",
                                systemImage: "person.2"
                            )
                        }
                        ForEach(store.followedArtists) { artist in
                            NavigationLink(value: Route.artist(artist.id)) {
                                row(artist.name, "Artist", artist.imageUrl, systemImage: "person.fill", circular: true)
                            }
                            .buttonStyle(.plain)
                        }

                    case .albums:
                        ForEach(store.albums) { album in
                            NavigationLink(value: Route.album(album.id)) {
                                row(
                                    album.title,
                                    ["Album", album.artist?.name, album.year].compactMap { $0 }.joined(separator: " · "),
                                    album.coverImageUrl
                                )
                            }
                            .buttonStyle(.plain)
                        }

                    case .songs:
                        if store.likedSongs.isEmpty {
                            EmptyStateView(
                                title: "No liked songs",
                                message: "Tap the heart on any track to save it here.",
                                systemImage: "heart"
                            )
                        }
                        ForEach(Array(store.likedSongs.enumerated()), id: \.element.id) { index, track in
                            TrackRow(
                                track: track,
                                isCurrent: player.currentTrack?.id == track.id,
                                action: { player.play(tracks: store.likedSongs, startAt: index) },
                                onMore: { actionTrack = track }
                            )
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 140)
            }
            .navigationTitle("Your Library")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showCreate = true } label: { Image(systemName: "plus") }
                }
            }
            .refreshable { await store.reload() }
            .task { await store.loadIfNeeded() }
            .musicyDestinations()
            .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
            .alert("New playlist", isPresented: $showCreate) {
                TextField("Playlist name", text: $newPlaylistName)
                Button("Create") {
                    let name = newPlaylistName.trimmingCharacters(in: .whitespaces)
                    newPlaylistName = ""
                    guard !name.isEmpty else { return }
                    Task { _ = await store.createPlaylist(named: name) }
                }
                Button("Cancel", role: .cancel) { newPlaylistName = "" }
            }
        }
    }

    private func pinnedRow(
        _ title: String,
        subtitle: String,
        symbol: String,
        colors: [Color],
        route: Route
    ) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: 12) {
                LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
                    .frame(width: 52, height: 52)
                    .overlay(Image(systemName: symbol).foregroundColor(.white))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.subheadline.bold())
                    Text(subtitle).font(.caption).foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }

    private func row(
        _ title: String,
        _ subtitle: String,
        _ imageURL: String?,
        systemImage: String = "square.stack",
        circular: Bool = false
    ) -> some View {
        HStack(spacing: 12) {
            Artwork(url: imageURL, systemImage: systemImage, cornerRadius: 8, circular: circular)
                .frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.subheadline.bold()).lineLimit(1)
                Text(subtitle).font(.caption).foregroundColor(.secondary).lineLimit(1)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
