import SwiftUI

struct MainTabView: View {
    @StateObject private var player = AudioPlayer.shared

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView {
                HomeView()
                    .tabItem { Label("Home", systemImage: "house.fill") }
                SearchView()
                    .tabItem { Label("Search", systemImage: "magnifyingglass") }
                LibraryView()
                    .tabItem { Label("Library", systemImage: "square.stack.3d.up.fill") }
            }

            if let track = player.currentTrack {
                MiniPlayer(track: track)
                    .padding(.bottom, 48)
            }
        }
    }
}

struct MiniPlayer: View {
    let track: Track
    @StateObject private var player = AudioPlayer.shared

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: (track.album?.coverImageUrl ?? track.coverImageUrl).flatMap { URL(string: $0) }) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Color("Surface")
                }
            }
            .frame(width: 48, height: 48)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(track.title)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                Text(track.artist?.name ?? "")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button { player.toggle() } label: {
                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.title3)
            }
        }
        .padding()
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}
