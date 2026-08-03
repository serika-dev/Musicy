import SwiftUI

struct HomeView: View {
    @State private var mixes: [DailyMix] = []
    @State private var albums: [Album] = []
    @State private var artists: [Artist] = []
    @State private var playlists: [Playlist] = []
    @State private var error: String?
    @State private var loading = true

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

                    if !albums.isEmpty {
                        section("New albums") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(albums) { album in
                                        MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.artist?.name) {
                                            if let tracks = album.tracks, let first = tracks.first {
                                                AudioPlayer.shared.play(track: first, tracks: tracks)
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    if !artists.isEmpty {
                        section("Artists") {
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
            Text("\(greetingText).")
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
            async let m: [DailyMix] = MusicyAPI.shared.getDailyMixes()
            async let a: AlbumsResponse = MusicyAPI.shared.getAlbums()
            async let ar: ArtistsResponse = MusicyAPI.shared.getArtists()
            async let p: PlaylistsResponse = MusicyAPI.shared.getPlaylists()
            mixes = try await m
            albums = try await a.albums
            artists = try await ar.artists
            playlists = try await p.playlists
        } catch {
            self.error = error.localizedDescription
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
