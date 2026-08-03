import SwiftUI

struct MainTabView: View {
    @ObservedObject private var player = AudioPlayer.shared
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var sync = SyncClient.shared
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

            if player.currentTrack != nil {
                MiniPlayer { showPlayer = true }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 52)
                    .transition(.move(edge: .bottom))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: player.currentTrack)
        .sheet(isPresented: $showPlayer) {
            PlayerView()
        }
        .task {
            await store.loadIfNeeded()
            sync.start()
        }
        .overlay(alignment: .top) {
            if let toast = store.toast {
                Text(toast)
                    .font(.footnote.bold())
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.thinMaterial, in: Capsule())
                    .padding(.top, 8)
                    .task(id: toast) {
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        store.toast = nil
                    }
            }
        }
    }
}

/// The floating now-playing bar, matching the web app's rounded player card
/// that sits just above the tab bar.
struct MiniPlayer: View {
    var onOpen: () -> Void

    @ObservedObject private var player = AudioPlayer.shared
    @ObservedObject private var clock = AudioPlayer.shared.clock
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var sync = SyncClient.shared

    var body: some View {
        if let track = player.currentTrack {
            VStack(spacing: 0) {
                ProgressView(value: clock.progress)
                    .progressViewStyle(.linear)
                    .tint(.accentColor)
                    .frame(height: 2)

                HStack(spacing: 12) {
                    Button(action: onOpen) {
                        HStack(spacing: 12) {
                            Artwork(url: track.artworkUrl, cornerRadius: 8)
                                .frame(width: 44, height: 44)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(track.title).font(.subheadline.bold()).lineLimit(1)
                                Text(track.artistLine).font(.caption).foregroundColor(.secondary).lineLimit(1)
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)

                    Button { store.toggleLike(track) } label: {
                        Image(systemName: store.isLiked(track.id) ? "heart.fill" : "heart")
                            .foregroundColor(store.isLiked(track.id) ? .red : .secondary)
                    }
                    .buttonStyle(.plain)

                    Button {
                        sync.isRemoteControlling ? sync.sendCommand("toggle") : player.toggle()
                    } label: {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.title3)
                            .foregroundColor(.accentColor)
                    }
                    .buttonStyle(.plain)

                    Button {
                        sync.isRemoteControlling ? sync.sendCommand("next") : player.next()
                    } label: {
                        Image(systemName: "forward.fill").foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .background(Color("Surface").opacity(0.98))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(radius: 8)
        }
    }
}
