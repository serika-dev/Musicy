import SwiftUI

struct LibraryView: View {
    @State private var tracks: [Track] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 8) {
                Text("Your Library")
                    .font(.title.bold())
                Text("Liked songs and saved playlists")
                    .foregroundColor(.secondary)

                if loading {
                    Spacer()
                    ProgressView()
                        .frame(maxWidth: .infinity)
                    Spacer()
                } else if let error = error {
                    Text(error)
                        .foregroundColor(.red)
                } else if tracks.isEmpty {
                    Spacer()
                    Text("No liked songs yet. Heart tracks from the Home or Search tab.")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                    Spacer()
                } else {
                    List(tracks) { track in
                        TrackRow(track: track) {
                            AudioPlayer.shared.play(track: track, tracks: tracks)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .padding(.horizontal)
            .background(Color("Background").ignoresSafeArea())
            .navigationTitle("Library")
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        do {
            tracks = try await MusicyAPI.shared.getLikedSongs().tracks
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
