import SwiftUI

struct LibraryView: View {
    @State private var tracks: [Track] = []

    var body: some View {
        NavigationStack {
            List(tracks) { track in
                TrackRow(track: track) {
                    AudioPlayer.shared.play(track: track, tracks: tracks)
                }
            }
            .listStyle(.plain)
            .background(Color("Background"))
            .navigationTitle("Library")
            .task { await load() }
        }
    }

    private func load() async {
        do {
            tracks = try await MusicyAPI.shared.getLikedSongs().tracks
        } catch {
            tracks = []
        }
    }
}
