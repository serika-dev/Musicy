import SwiftUI

struct SearchView: View {
    @State private var query = ""
    @State private var results: SearchResponse?

    var body: some View {
        NavigationStack {
            VStack {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search tracks, albums, artists...", text: $query)
                        .textFieldStyle(.plain)
                }
                .padding()
                .background(Color("Surface"))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding()

                Button("Search") {
                    Task { await search() }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentColor"))
                .disabled(query.isEmpty)

                List {
                    Section("Tracks") {
                        ForEach(results?.tracks?.items ?? []) { track in
                            TrackRow(track: track) {
                                AudioPlayer.shared.play(track: track, tracks: [track])
                            }
                        }
                    }
                    Section("Albums") {
                        ForEach(results?.albums?.items ?? []) { album in
                            TrackRow(track: Track(id: album.id, title: album.title, artist: album.artist, album: album)) {}
                        }
                    }
                    Section("Artists") {
                        ForEach(results?.artists?.items ?? []) { artist in
                            TrackRow(track: Track(id: artist.id, title: artist.name, artist: artist)) {}
                        }
                    }
                }
                .listStyle(.plain)
            }
            .background(Color("Background"))
            .navigationTitle("Search")
        }
    }

    private func search() async {
        do {
            results = try await MusicyAPI.shared.search(query: query)
        } catch {
            results = nil
        }
    }
}
