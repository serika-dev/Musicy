import SwiftUI

struct HomeView: View {
    @State private var feed: FeedResponse?
    @State private var mixes: [DailyMix] = []
    @State private var albums: [Album] = []
    @State private var artists: [Artist] = []
    @State private var playlists: [Playlist] = []
    @State private var error: String?
    @State private var loading = true

    private var api: MusicyAPI { MusicyAPI.shared }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    greeting

                    if loading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    }

                    if let featured = feed?.featuredAlbum {
                        FeaturedHero(album: featured)
                            .padding(.horizontal)
                    }

                    if !(feed?.recentlyPlayed ?? []).isEmpty {
                        section("Jump Back In") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(feed?.recentlyPlayed ?? []) { track in
                                        MediaCard(imageURL: track.album?.coverImageUrl ?? track.coverImageUrl, title: track.title, subtitle: track.artist?.name) {
                                            AudioPlayer.shared.play(track: track, tracks: [track])
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    if !mixes.isEmpty {
                        section("Made for you") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(mixes) { mix in
                                        MediaCard(imageURL: mix.coverImageUrl, title: mix.name, subtitle: mix.description) {
                                            if let tracks = mix.tracks, let first = tracks.first {
                                                AudioPlayer.shared.play(track: first, tracks: tracks)
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    if !(feed?.followedAlbums ?? []).isEmpty {
                        section("New from Artists You Follow") {
                            HomeAlbumRow(albums: feed?.followedAlbums ?? [])
                        }
                    }

                    if !(feed?.recommendedTracks ?? []).isEmpty {
                        section("Recommended for You") {
                            HomeTrackRow(tracks: feed?.recommendedTracks ?? [])
                        }
                    }

                    if !albums.isEmpty {
                        section("New albums") {
                            HomeAlbumRow(albums: albums)
                        }
                    }

                    if !(feed?.topArtists ?? []).isEmpty {
                        section("Your Top Artists") {
                            HomeArtistRow(artists: feed?.topArtists ?? [])
                        }
                    }

                    if !(feed?.recommendedArtists ?? []).isEmpty {
                        section("Artists We Think You'll Like") {
                            HomeArtistRow(artists: feed?.recommendedArtists ?? [])
                        }
                    }

                    if !(feed?.discoverAlbums ?? []).isEmpty {
                        section("More to Explore") {
                            HomeAlbumRow(albums: feed?.discoverAlbums ?? [])
                        }
                    }

                    if !artists.isEmpty {
                        section("Artists") {
                            HomeArtistRow(artists: artists)
                        }
                    }

                    if !(feed?.newReleases ?? []).isEmpty {
                        section("New Releases") {
                            HomeAlbumRow(albums: feed?.newReleases ?? [])
                        }
                    }

                    if !playlists.isEmpty {
                        section("Community playlists") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(playlists) { playlist in
                                        MediaCard(imageURL: playlist.coverImageUrl, title: playlist.name, subtitle: "\(playlist._count?.tracks ?? 0) tracks") {
                                            if let tracks = playlist.tracks?.map({ $0.track }), let first = tracks.first {
                                                AudioPlayer.shared.play(track: first, tracks: tracks)
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color("Background").ignoresSafeArea())
            .navigationTitle("Home")
        }
        .task { await load() }
    }

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(greetingText), \(firstName).")
                .font(.largeTitle.bold())
            Text("Ready to lose yourself in the music?")
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<5: return "Good night"
        case 5..<12: return "Good morning"
        case 12..<18: return "Good afternoon"
        default: return "Good evening"
        }
    }

    private var firstName: String {
        let name = api.userName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return "there" }
        return name.split(separator: " ").first.map(String.init) ?? name
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3.bold())
                .padding(.horizontal)
            content()
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            async let f: FeedResponse = api.getFeed()
            async let m: [DailyMix] = api.getDailyMixes()
            async let a: AlbumsResponse = api.getAlbums()
            async let ar: ArtistsResponse = api.getArtists()
            async let p: PlaylistsResponse = api.getPlaylists()
            feed = try await f
            mixes = try await m
            albums = try await a.albums
            artists = try await ar.artists
            playlists = try await p.playlists
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct FeaturedHero: View {
    let album: Album

    var body: some View {
        HStack(spacing: 16) {
            AsyncImage(url: album.coverImageUrl.flatMap { URL(string: $0) }) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Color("Surface")
                }
            }
            .frame(width: 96, height: 96)
            .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(alignment: .leading, spacing: 4) {
                Text("Featured")
                    .font(.caption.bold())
                    .foregroundColor(Color("AccentColor"))
                Text(album.title)
                    .font(.title3.bold())
                    .lineLimit(1)
                Text(album.artist?.name ?? "")
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button {
                if let track = album.tracks?.first {
                    AudioPlayer.shared.play(track: track, tracks: album.tracks ?? [track])
                }
            } label: {
                Image(systemName: "play.fill")
                    .font(.title2)
                    .foregroundColor(.white)
                    .frame(width: 52, height: 52)
                    .background(Color("AccentColor"))
                    .clipShape(Circle())
            }
        }
        .padding()
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct HomeAlbumRow: View {
    let albums: [Album]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(albums) { album in
                    MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.artist?.name) {
                        if let track = album.tracks?.first {
                            AudioPlayer.shared.play(track: track, tracks: album.tracks ?? [track])
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct HomeTrackRow: View {
    let tracks: [Track]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(tracks) { track in
                    MediaCard(imageURL: track.album?.coverImageUrl ?? track.coverImageUrl, title: track.title, subtitle: track.artist?.name) {
                        AudioPlayer.shared.play(track: track, tracks: [track])
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct HomeArtistRow: View {
    let artists: [Artist]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(artists) { artist in
                    ArtistCard(artist: artist)
                }
            }
            .padding(.horizontal)
        }
    }
}

struct ArtistCard: View {
    let artist: Artist

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AsyncImage(url: artist.imageUrl.flatMap { URL(string: $0) }) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Color("Surface")
                }
            }
            .frame(width: 132, height: 132)
            .clipShape(Circle())

            Text(artist.name)
                .font(.subheadline.bold())
                .lineLimit(1)
        }
        .frame(width: 132)
    }
}
