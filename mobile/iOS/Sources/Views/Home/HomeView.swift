import SwiftUI

struct HomeView: View {
    @State private var mixes: [DailyMix] = []
    @State private var albums: [Album] = []
    @State private var artists: [Artist] = []
    @State private var playlists: [Playlist] = []
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    greeting

                    if !mixes.isEmpty {
                        section("Your Daily Mixes") {
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
                        section("New Albums") {
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
                                        MediaCard(imageURL: artist.imageUrl, title: artist.name, subtitle: nil) {}
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    if !playlists.isEmpty {
                        section("Community Playlists") {
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
            .background(Color("Background"))
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
