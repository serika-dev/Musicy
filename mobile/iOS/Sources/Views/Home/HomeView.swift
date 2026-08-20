import SwiftUI

struct HomeView: View {
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var api = MusicyAPI.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var actionTrack: Track?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    greeting
                    quickAccess

                    if let featured = store.feed?.featuredAlbum {
                        featuredCard(featured)
                    }

                    if !store.genres.isEmpty {
                        SectionHeader("Browse categories", seeAll: .collection(.genres))
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(store.genres) { genre in
                                    NavigationLink(value: Route.genre(genre.name)) {
                                        CategoryTile(name: genre.name, count: genre.count, height: 84)
                                            .frame(width: 150)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    if !store.dailyMixes.isEmpty {
                        SectionHeader(
                            "Made for you",
                            subtitle: "Daily mixes built from what you play",
                            seeAll: .collection(.mixes)
                        )
                        horizontalRow(store.dailyMixes) { mix in
                            NavigationLink(value: Route.mix(mix.id)) {
                                MediaCard(
                                    imageURL: mix.coverImageUrl ?? mix.tracks?.first?.artworkUrl,
                                    title: mix.name,
                                    subtitle: mix.description ?? "\(mix.trackCount) tracks",
                                    width: 164,
                                    playAction: { player.play(tracks: mix.tracks ?? []) }
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    let recommended = Array((store.feed?.recommendedTracks ?? []).prefix(8))
                    if !recommended.isEmpty {
                        SectionHeader("Recommended for you", subtitle: "Based on your listening")
                        VStack(spacing: 0) {
                            ForEach(Array(recommended.enumerated()), id: \.element.id) { index, track in
                                TrackRow(
                                    track: track,
                                    isCurrent: player.currentTrack?.id == track.id,
                                    action: { player.play(tracks: recommended, startAt: index) },
                                    onMore: { actionTrack = track }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }

                    let recent = store.feed?.recentlyPlayed ?? store.recentlyPlayed
                    if !recent.isEmpty {
                        SectionHeader("Jump back in", seeAll: .collection(.recent))
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(alignment: .top, spacing: 14) {
                                ForEach(Array(recent.enumerated()), id: \.element.id) { index, track in
                                    Button {
                                        player.play(tracks: recent, startAt: index)
                                    } label: {
                                        MediaCard(
                                            imageURL: track.artworkUrl,
                                            title: track.title,
                                            subtitle: track.artistLine,
                                            width: 134
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    let newReleases = store.feed?.newReleases ?? store.albums
                    if !newReleases.isEmpty {
                        SectionHeader("New releases", seeAll: .collection(.newReleases))
                        albumRow(newReleases)
                    }

                    if let followed = store.feed?.followedAlbums, !followed.isEmpty {
                        SectionHeader("From artists you follow")
                        albumRow(followed)
                    }

                    if let topArtists = store.feed?.topArtists, !topArtists.isEmpty {
                        SectionHeader("Your top artists", seeAll: .collection(.artists))
                        artistRow(topArtists)
                    }

                    if let discover = store.feed?.discoverAlbums, !discover.isEmpty {
                        SectionHeader("Discover", subtitle: "Albums in genres you like")
                        albumRow(discover)
                    }

                    if let suggested = store.feed?.recommendedArtists, !suggested.isEmpty {
                        SectionHeader("Artists you might like")
                        artistRow(suggested)
                    }

                    if !store.playlists.isEmpty {
                        SectionHeader("Featured playlists", seeAll: .collection(.playlists))
                        horizontalRow(store.playlists) { playlist in
                            NavigationLink(value: Route.playlist(playlist.id)) {
                                MediaCard(
                                    imageURL: playlist.coverImageUrl,
                                    title: playlist.name,
                                    subtitle: "\(playlist.trackCount) tracks",
                                    systemImage: "music.note.list"
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    if let error = store.errorMessage {
                        EmptyStateView(title: "Can't load your feed", message: error, systemImage: "wifi.slash")
                    }
                }
                .padding(.vertical)
                .padding(.bottom, 140)
            }
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await store.reload() }
            .task { await store.loadIfNeeded() }
            .musicyDestinations()
            .sheet(item: $actionTrack) { track in
                TrackActionsSheet(track: track)
            }
        }
    }

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(Self.greetingText).font(.largeTitle.bold())
            Text("Welcome back, \(store.profile?.label ?? api.userName)")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
    }

    private var quickAccess: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                quickTile("Liked Songs", "heart.fill", route: .liked)
                quickTile("Recently played", "clock.arrow.circlepath", route: .collection(.recent))
            }
            HStack(spacing: 8) {
                quickTile("Playlists", "music.note.list", route: .collection(.playlists))
                quickTile("Artists", "person.2.fill", route: .collection(.followed))
            }
        }
        .padding(.horizontal)
    }

    private func quickTile(_ title: String, _ symbol: String, route: Route) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: 10) {
                Image(systemName: symbol)
                    .foregroundColor(.white)
                    .frame(width: 34, height: 34)
                    .background(Color.accentColor)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                Text(title).font(.subheadline.bold()).lineLimit(1)
                Spacer()
            }
            .padding(8)
            .background(Color("Surface"))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func featuredCard(_ album: Album) -> some View {
        NavigationLink(value: Route.album(album.id)) {
            ZStack(alignment: .bottom) {
                Artwork(url: album.coverImageUrl, cornerRadius: 16)
                    .frame(maxWidth: .infinity)
                    .frame(height: 190)
                LinearGradient(colors: [.clear, .black.opacity(0.85)], startPoint: .top, endPoint: .bottom)
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("FEATURED").font(.caption2.bold()).foregroundColor(.accentColor)
                        Text(album.title).font(.title2.bold()).foregroundColor(.white).lineLimit(2)
                        Text(album.artist?.name ?? "").font(.subheadline).foregroundColor(.white.opacity(0.8))
                    }
                    Spacer()
                    Button {
                        player.play(tracks: album.tracks ?? [])
                    } label: {
                        Image(systemName: "play.fill")
                            .font(.title3)
                            .foregroundColor(.white)
                            .padding(14)
                            .background(Color.accentColor)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(16)
            }
            .frame(height: 190)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding(.horizontal)
        }
        .buttonStyle(.plain)
    }

    private func albumRow(_ albums: [Album]) -> some View {
        horizontalRow(albums) { album in
            NavigationLink(value: Route.album(album.id)) {
                MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.artist?.name)
            }
            .buttonStyle(.plain)
        }
    }

    private func artistRow(_ artists: [Artist]) -> some View {
        horizontalRow(artists) { artist in
            NavigationLink(value: Route.artist(artist.id)) {
                MediaCard(
                    imageURL: artist.imageUrl,
                    title: artist.name,
                    subtitle: artist._count?.tracks.map { "\($0) tracks" } ?? "Artist",
                    circular: true,
                    systemImage: "person.fill"
                )
            }
            .buttonStyle(.plain)
        }
    }

    private func horizontalRow<Item: Identifiable, Content: View>(
        _ items: [Item],
        @ViewBuilder content: @escaping (Item) -> Content
    ) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 14) {
                ForEach(items) { item in content(item) }
            }
            .padding(.horizontal)
        }
    }

    private static var greetingText: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 5..<12: return "Good morning"
        case 12..<18: return "Good afternoon"
        case 18..<22: return "Good evening"
        default: return "Late night listening"
        }
    }
}

/// Registers every `Route` once so each tab's stack can push the same screens.
extension View {
    func musicyDestinations() -> some View {
        navigationDestination(for: Route.self) { route in
            switch route {
            case let .album(id): AlbumDetailView(albumId: id)
            case let .artist(id): ArtistDetailView(artistId: id)
            case let .artistTracks(id): ArtistTracksView(artistId: id)
            case let .playlist(id): PlaylistDetailView(playlistId: id)
            case let .mix(id): DailyMixDetailView(mixId: id)
            case let .genre(name): GenreDetailView(genre: name)
            case .liked: LikedSongsView()
            case .settings: SettingsView()
            case let .collection(kind): CollectionView(kind: kind)
            }
        }
    }
}
