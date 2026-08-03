import SwiftUI

struct SearchView: View {
    @State private var query = ""
    @State private var results: SearchResponse?
    @State private var loading = false
    @State private var searched = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Songs, artists, albums, playlists...", text: $query)
                        .textFieldStyle(.plain)
                        .submitLabel(.search)
                        .onSubmit { Task { await search() } }
                }
                .padding()
                .background(Color("Surface"))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Button {
                    Task { await search() }
                } label: {
                    if loading {
                        ProgressView()
                    } else {
                        Text("Search")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentColor"))
                .disabled(query.isEmpty || loading)
                .frame(maxWidth: .infinity)

                ScrollView {
                    if !searched {
                        Text("Type above to search your library and catalog.")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 40)
                    } else if let results = results {
                        let tracks = results.tracks?.items ?? []
                        let albums = results.albums?.items ?? []
                        let artists = results.artists?.items ?? []

                        if tracks.isEmpty && albums.isEmpty && artists.isEmpty {
                            Text("No results for \"\(query)\"")
                                .foregroundColor(.secondary)
                                .padding(.top, 40)
                        } else {
                            VStack(alignment: .leading, spacing: 24) {
                                if !tracks.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Tracks")
                                            .font(.title3.bold())
                                        ForEach(tracks) { track in
                                            TrackRow(track: track) {
                                                AudioPlayer.shared.play(track: track, tracks: [track])
                                            }
                                        }
                                    }
                                }

                                if !albums.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Albums")
                                            .font(.title3.bold())
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
                                        }
                                    }
                                }

                                if !artists.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Artists")
                                            .font(.title3.bold())
                                        ScrollView(.horizontal, showsIndicators: false) {
                                            HStack(spacing: 16) {
                                                ForEach(artists) { artist in
                                                    ArtistCard(artist: artist)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color("Background").ignoresSafeArea())
            .navigationTitle("Search")
        }
    }

    private func search() async {
        guard !query.isEmpty else { return }
        loading = true
        searched = true
        do {
            results = try await MusicyAPI.shared.search(query: query)
        } catch {
            results = nil
        }
        loading = false
    }
}
