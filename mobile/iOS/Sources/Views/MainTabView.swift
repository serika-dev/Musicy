import SwiftUI

struct MainTabView: View {
    @StateObject private var api = MusicyAPI.shared
    @StateObject private var player = AudioPlayer.shared
    @State private var showPlayer = false

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView {
                HomeView()
                    .tabItem { Label("Home", systemImage: "house.fill") }
                SearchView()
                    .tabItem { Label("Search", systemImage: "magnifyingglass") }
                LibraryView()
                    .tabItem { Label("Library", systemImage: "square.stack.3d.up.fill") }
                ProfileView()
                    .tabItem { Label("Profile", systemImage: "person.fill") }
            }

            VStack(spacing: 0) {
                if let track = player.currentTrack {
                    MiniPlayer(track: track) { showPlayer = true }
                        .padding(.bottom, 8)
                }
            }
            .padding(.bottom, 48)
        }
        .sheet(isPresented: $showPlayer) {
            PlayerView()
                .presentationBackground(.black.opacity(0.9))
        }
    }
}

struct MiniPlayer: View {
    let track: Track
    @StateObject private var player = AudioPlayer.shared
    var onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(spacing: 12) {
                AsyncImage(url: (track.album?.coverImageUrl ?? track.coverImageUrl).flatMap { URL(string: $0) }) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Color("Surface")
                    }
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 10))

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
                        .foregroundColor(Color("AccentColor"))
                }
            }
            .padding()
            .background(Color("Surface").opacity(0.95))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal)
        }
        .buttonStyle(.plain)
    }
}
