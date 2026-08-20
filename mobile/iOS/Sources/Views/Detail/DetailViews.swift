import SwiftUI

/// Small helper that loads one value and renders loading/error/content.
struct AsyncContent<Value, Content: View>: View {
    let load: () async throws -> Value
    @ViewBuilder let content: (Value) -> Content

    @State private var value: Value?
    @State private var error: String?

    var body: some View {
        Group {
            if let value {
                content(value)
            } else if let error {
                EmptyStateView(title: "Couldn't load this", message: error, systemImage: "exclamationmark.triangle")
            } else {
                ProgressView().padding(40)
            }
        }
        .task {
            guard value == nil else { return }
            do {
                value = try await load()
            } catch let apiError as APIError {
                error = apiError.friendlyMessage
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

// MARK: - Album

struct AlbumDetailView: View {
    let albumId: String
    @ObservedObject private var player = AudioPlayer.shared
    @State private var actionTrack: Track?

    var body: some View {
        AsyncContent(load: { try await MusicyAPI.shared.getAlbum(id: albumId) }) { album in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    DetailHeader(
                        title: album.title,
                        subtitle: album.artist?.name ?? "",
                        meta: [album.albumType?.capitalized, album.year, "\(album.trackCount) tracks"]
                            .compactMap { $0 }
                            .joined(separator: " · "),
                        artworkURL: album.coverImageUrl,
                        onPlay: { player.play(tracks: album.tracks ?? []) },
                        onShuffle: { player.play(tracks: (album.tracks ?? []).shuffled()) }
                    )

                    let tracks = album.tracks ?? []
                    if tracks.isEmpty {
                        EmptyStateView(title: "No tracks here yet", message: "This album has no published tracks.")
                    }
                    ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                        TrackRow(
                            track: track,
                            index: index + 1,
                            isCurrent: player.currentTrack?.id == track.id,
                            showArtwork: false,
                            action: { player.play(tracks: tracks, startAt: index) },
                            onMore: { actionTrack = track }
                        )
                    }

                    if let artist = album.artist {
                        Divider().padding(.vertical, 8)
                        NavigationLink(value: Route.artist(artist.id)) {
                            HStack(spacing: 12) {
                                Artwork(url: artist.imageUrl, systemImage: "person.fill", circular: true)
                                    .frame(width: 48, height: 48)
                                VStack(alignment: .leading) {
                                    Text(artist.name).font(.subheadline.bold())
                                    Text("Go to artist").font(.caption).foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 140)
            }
            .navigationTitle(album.title)
            .navigationBarTitleDisplayMode(.inline)
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - Artist

struct ArtistDetailView: View {
    let artistId: String
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var tracks: [Track] = []
    @State private var albums: [Album] = []
    @State private var isFollowing = false
    @State private var actionTrack: Track?
    @State private var albumFilter = "all"
    @State private var albumSort = "year"

    var body: some View {
        AsyncContent(load: { try await MusicyAPI.shared.getArtist(id: artistId) }) { artist in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    // Artist banner: wide image with gradient fade into the background.
                    if let banner = artist.bannerUrl, let bannerURL = MusicyAPI.shared.absoluteURL(banner) {
                        ZStack(alignment: .bottom) {
                            AsyncImage(url: bannerURL) { phase in
                                if let image = phase.image {
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } else {
                                    LinearGradient(
                                        colors: [Color.accentColor.opacity(0.35), Color("Surface")],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                }
                            }
                            .frame(height: 200)
                            .clipped()

                            LinearGradient(
                                colors: [.clear, Color("Surface")],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                            .frame(height: 80)
                        }
                    }

                    DetailHeader(
                        title: artist.name,
                        subtitle: artist.verified == true ? "Verified artist" : "Artist",
                        meta: artist._count?.tracks.map { "\($0) tracks" },
                        artworkURL: artist.imageUrl,
                        circular: true,
                        onPlay: { player.play(tracks: tracks.isEmpty ? topTracks(artist) : tracks) },
                        onShuffle: { player.play(tracks: (tracks.isEmpty ? topTracks(artist) : tracks).shuffled()) }
                    )

                    Button {
                        Task { isFollowing = await store.setFollowing(artistId, follow: !isFollowing) }
                    } label: {
                        Label(isFollowing ? "Following" : "Follow", systemImage: isFollowing ? "person.badge.minus" : "person.badge.plus")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)

                    if let bio = artist.bio, !bio.isEmpty {
                        Text(bio).font(.footnote).foregroundColor(.secondary)
                    }

                    let popular = topTracks(artist)
                    let playQueue = tracks.isEmpty ? popular : tracks

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            filterChip("All", selected: albumFilter == "all") { albumFilter = "all" }
                            filterChip("Albums", selected: albumFilter == "albums") { albumFilter = "albums" }
                            filterChip("Singles", selected: albumFilter == "singles") { albumFilter = "singles" }
                            filterChip("Year", selected: albumSort == "year") { albumSort = "year" }
                            filterChip("Name", selected: albumSort == "name") { albumSort = "name" }
                            Button {
                                player.play(tracks: playQueue.shuffled())
                            } label: {
                                Label("Radio", systemImage: "dot.radiowaves.left.and.right")
                                    .font(.caption.bold())
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }

                    if !popular.isEmpty {
                        HStack {
                            Text("Popular").font(.title3.bold())
                            Spacer()
                            if playQueue.count > 10 || (artist._count?.tracks ?? 0) > popular.count {
                                NavigationLink(value: Route.artistTracks(artistId)) {
                                    Text("See all").font(.caption.bold())
                                }
                            }
                        }
                        .padding(.top, 8)
                        ForEach(Array(popular.prefix(10).enumerated()), id: \.element.id) { index, track in
                            TrackRow(
                                track: track,
                                isCurrent: player.currentTrack?.id == track.id,
                                action: { player.play(tracks: playQueue.isEmpty ? popular : playQueue, startAt: index) },
                                onMore: { actionTrack = track }
                            )
                        }
                    }

                    if playQueue.count > 10 {
                        NavigationLink(value: Route.artistTracks(artistId)) {
                            HStack {
                                Image(systemName: "music.note.list")
                                Text("See all \(playQueue.count) songs")
                                    .font(.subheadline.bold())
                                Spacer()
                            }
                            .padding(.vertical, 8)
                        }
                    }

                    let artistAlbums = filteredAlbums(artist.albums ?? albums)
                    if !artistAlbums.isEmpty {
                        Text("Albums").font(.title3.bold()).padding(.top, 8)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(alignment: .top, spacing: 14) {
                                ForEach(artistAlbums) { album in
                                    NavigationLink(value: Route.album(album.id)) {
                                        MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.year)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    if let members = artist.members, !members.isEmpty {
                        Text("Members").font(.title3.bold()).padding(.top, 8)
                        ForEach(members) { member in
                            NavigationLink(value: Route.artist(member.id)) {
                                HStack(spacing: 12) {
                                    Artwork(url: member.imageUrl, systemImage: "person.fill", circular: true)
                                        .frame(width: 44, height: 44)
                                    Text(member.name).font(.subheadline)
                                    Spacer()
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 140)
            }
            .navigationTitle(artist.name)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                // `??` takes a non-async autoclosure, so the fallback fetch
                // cannot live on its right-hand side.
                if let known = artist.isFollowing {
                    isFollowing = known
                } else {
                    isFollowing = (try? await MusicyAPI.shared.getFollowState(id: artistId)) ?? false
                }
                tracks = (try? await MusicyAPI.shared.getAllArtistTracks(id: artistId)) ?? []
                if artist.albums == nil {
                    albums = (try? await MusicyAPI.shared.getArtistAlbums(id: artistId))?.albums ?? []
                }
            }
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }

    private func topTracks(_ artist: Artist) -> [Track] {
        artist.topTracks ?? Array(tracks.prefix(10))
    }

    private func filteredAlbums(_ list: [Album]) -> [Album] {
        let filtered: [Album]
        switch albumFilter {
        case "albums": filtered = list.filter { !$0.looksLikeSingle }
        case "singles": filtered = list.filter { $0.looksLikeSingle }
        default: filtered = list
        }
        if albumSort == "name" {
            return filtered.sorted { $0.title.lowercased() < $1.title.lowercased() }
        }
        return filtered.sorted { ($0.year ?? "0000") > ($1.year ?? "0000") }
    }

    private func filterChip(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.bold())
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(selected ? Color.accentColor : Color("Surface"))
                .foregroundColor(selected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct ArtistTracksView: View {
    let artistId: String
    @ObservedObject private var player = AudioPlayer.shared
    @ObservedObject private var downloads = DownloadStore.shared
    @State private var tracks: [Track] = []
    @State private var name = "Artist"
    @State private var actionTrack: Track?
    @State private var loaded = false

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 6) {
                if !loaded { ProgressView().frame(maxWidth: .infinity).padding() }
                if loaded, tracks.isEmpty {
                    EmptyStateView(title: "No songs yet", message: "Nothing published for this artist.")
                }
                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                    TrackRow(
                        track: track,
                        index: index + 1,
                        isCurrent: player.currentTrack?.id == track.id,
                        action: { player.play(tracks: tracks, startAt: index) },
                        onMore: { actionTrack = track }
                    )
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 140)
        }
        .navigationTitle("All songs")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await downloads.downloadAll(tracks) }
                } label: {
                    Image(systemName: "arrow.down.circle")
                }
                .disabled(tracks.isEmpty)
            }
        }
        .task {
            name = (try? await MusicyAPI.shared.getArtist(id: artistId))?.name ?? "Artist"
            tracks = (try? await MusicyAPI.shared.getAllArtistTracks(id: artistId)) ?? []
            loaded = true
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - Playlist

struct PlaylistDetailView: View {
    let playlistId: String
    @ObservedObject private var player = AudioPlayer.shared
    @State private var actionTrack: Track?

    var body: some View {
        AsyncContent(load: { try await MusicyAPI.shared.getPlaylist(id: playlistId) }) { playlist in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    let tracks = playlist.trackList
                    DetailHeader(
                        title: playlist.name,
                        subtitle: playlist.description ?? playlist.owner.map { "By \($0.label)" } ?? "Playlist",
                        meta: "\(tracks.count) tracks",
                        artworkURL: playlist.coverImageUrl ?? tracks.first?.artworkUrl,
                        onPlay: { player.play(tracks: tracks) },
                        onShuffle: { player.play(tracks: tracks.shuffled()) }
                    )

                    if tracks.isEmpty {
                        EmptyStateView(
                            title: "This playlist is empty",
                            message: "Add songs from anywhere using the ••• menu.",
                            systemImage: "music.note.list"
                        )
                    }
                    ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                        TrackRow(
                            track: track,
                            isCurrent: player.currentTrack?.id == track.id,
                            action: { player.play(tracks: tracks, startAt: index) },
                            onMore: { actionTrack = track }
                        )
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 140)
            }
            .navigationTitle(playlist.name)
            .navigationBarTitleDisplayMode(.inline)
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - Daily mix

struct DailyMixDetailView: View {
    let mixId: String
    @ObservedObject private var player = AudioPlayer.shared
    @State private var actionTrack: Track?

    var body: some View {
        AsyncContent(load: { try await MusicyAPI.shared.getDailyMix(id: mixId) }) { mix in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    let tracks = mix.tracks ?? []
                    DetailHeader(
                        title: mix.name,
                        subtitle: mix.description ?? "Made for you",
                        meta: "\(tracks.count) tracks",
                        artworkURL: mix.coverImageUrl ?? tracks.first?.artworkUrl,
                        onPlay: { player.play(tracks: tracks) },
                        onShuffle: { player.play(tracks: tracks.shuffled()) }
                    )
                    ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                        TrackRow(
                            track: track,
                            isCurrent: player.currentTrack?.id == track.id,
                            action: { player.play(tracks: tracks, startAt: index) },
                            onMore: { actionTrack = track }
                        )
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 140)
            }
            .navigationTitle(mix.name)
            .navigationBarTitleDisplayMode(.inline)
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - Genre / category

struct GenreDetailView: View {
    let genre: String
    @ObservedObject private var player = AudioPlayer.shared
    @State private var tracks: [Track] = []
    @State private var albums: [Album] = []
    @State private var loaded = false
    @State private var actionTrack: Track?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                CategoryTile(name: genre, count: tracks.count, height: 140)

                HStack(spacing: 14) {
                    Button { player.play(tracks: tracks.shuffled()) } label: {
                        Label("Shuffle", systemImage: "shuffle")
                    }
                    .buttonStyle(.bordered)
                    Button { player.play(tracks: tracks) } label: {
                        Image(systemName: "play.fill")
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.accentColor)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                if !albums.isEmpty {
                    Text("Albums in \(genre)").font(.title3.bold())
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: 14) {
                            ForEach(albums) { album in
                                NavigationLink(value: Route.album(album.id)) {
                                    MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.artist?.name)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                Text("Songs").font(.title3.bold())
                if !loaded {
                    ProgressView().frame(maxWidth: .infinity).padding()
                } else if tracks.isEmpty {
                    EmptyStateView(title: "Nothing in \(genre) yet", message: "Try another category.")
                }
                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                    TrackRow(
                        track: track,
                        isCurrent: player.currentTrack?.id == track.id,
                        action: { player.play(tracks: tracks, startAt: index) },
                        onMore: { actionTrack = track }
                    )
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 140)
        }
        .navigationTitle(genre)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard !loaded else { return }
            tracks = (try? await MusicyAPI.shared.getTracks(genre: genre))?.tracks ?? []
            albums = (try? await MusicyAPI.shared.getAlbums(limit: 30, genre: genre))?.albums ?? []
            loaded = true
        }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - Liked songs

struct LikedSongsView: View {
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var actionTrack: Track?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8) {
                DetailHeader(
                    title: "Liked Songs",
                    subtitle: "Everything you've hearted",
                    meta: "\(store.likedSongs.count) tracks",
                    artworkURL: store.likedSongs.first?.artworkUrl,
                    onPlay: { player.play(tracks: store.likedSongs) },
                    onShuffle: { player.play(tracks: store.likedSongs.shuffled()) }
                )

                if store.likedSongs.isEmpty {
                    EmptyStateView(
                        title: "No liked songs yet",
                        message: "Tap the heart on any track and it will show up here.",
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
            .padding(.horizontal)
            .padding(.bottom, 140)
        }
        .navigationTitle("Liked Songs")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }
}

// MARK: - "See all" collections

struct CollectionView: View {
    let kind: CollectionKind

    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var albums: [Album] = []
    @State private var artists: [Artist] = []
    @State private var playlists: [Playlist] = []
    @State private var mixes: [DailyMix] = []
    @State private var tracks: [Track] = []
    @State private var genres: [Genre] = []
    @State private var loaded = false
    @State private var actionTrack: Track?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 6) {
                if !loaded { ProgressView().frame(maxWidth: .infinity).padding() }

                ForEach(albums) { album in
                    NavigationLink(value: Route.album(album.id)) {
                        listRow(title: album.title, subtitle: [album.artist?.name, album.year].compactMap { $0 }.joined(separator: " · "), imageURL: album.coverImageUrl)
                    }
                    .buttonStyle(.plain)
                }
                ForEach(artists) { artist in
                    NavigationLink(value: Route.artist(artist.id)) {
                        listRow(title: artist.name, subtitle: "Artist", imageURL: artist.imageUrl, systemImage: "person.fill", circular: true)
                    }
                    .buttonStyle(.plain)
                }
                ForEach(playlists) { playlist in
                    NavigationLink(value: Route.playlist(playlist.id)) {
                        listRow(title: playlist.name, subtitle: "\(playlist.trackCount) tracks", imageURL: playlist.coverImageUrl, systemImage: "music.note.list")
                    }
                    .buttonStyle(.plain)
                }
                ForEach(mixes) { mix in
                    NavigationLink(value: Route.mix(mix.id)) {
                        listRow(title: mix.name, subtitle: mix.description ?? "\(mix.trackCount) tracks", imageURL: mix.coverImageUrl)
                    }
                    .buttonStyle(.plain)
                }
                ForEach(genres) { genre in
                    NavigationLink(value: Route.genre(genre.name)) {
                        CategoryTile(name: genre.name, count: genre.count, height: 80)
                    }
                    .buttonStyle(.plain)
                }
                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                    TrackRow(
                        track: track,
                        isCurrent: player.currentTrack?.id == track.id,
                        action: { player.play(tracks: tracks, startAt: index) },
                        onMore: { actionTrack = track }
                    )
                }

                if loaded, albums.isEmpty, artists.isEmpty, playlists.isEmpty, mixes.isEmpty, tracks.isEmpty, genres.isEmpty {
                    EmptyStateView(title: "Nothing here yet", message: "Come back once there's more in the library.")
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 140)
        }
        .navigationTitle(kind.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
    }

    @MainActor
    private func load() async {
        guard !loaded else { return }
        let api = MusicyAPI.shared
        switch kind {
        case .albums:
            albums = (try? await api.getAlbums(limit: 100))?.albums ?? []
        case .newReleases:
            if let cached = store.feed?.newReleases, !cached.isEmpty {
                albums = cached
            } else {
                albums = (try? await api.getAlbums(limit: 50))?.albums ?? []
            }
        case .artists: artists = (try? await api.getArtists(limit: 100))?.artists ?? []
        case .followed: artists = (try? await api.getFollowedArtists(limit: 100)) ?? []
        case .playlists: playlists = (try? await api.getPlaylists(limit: 100))?.playlists ?? []
        case .mixes: mixes = (try? await api.getDailyMixes()) ?? []
        case .recent: tracks = (try? await api.getRecentlyPlayed()) ?? []
        case .genres: genres = (try? await api.getGenres()) ?? []
        }
        loaded = true
    }

    private func listRow(
        title: String,
        subtitle: String,
        imageURL: String?,
        systemImage: String = "square.stack",
        circular: Bool = false
    ) -> some View {
        HStack(spacing: 12) {
            Artwork(url: imageURL, systemImage: systemImage, cornerRadius: 8, circular: circular)
                .frame(width: 50, height: 50)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.subheadline.bold()).lineLimit(1)
                Text(subtitle).font(.caption).foregroundColor(.secondary).lineLimit(1)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
