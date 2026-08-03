import SwiftUI

struct ProfileView: View {
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var api = MusicyAPI.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 10) {
                        Artwork(url: store.profile?.avatarUrl, systemImage: "person.fill", circular: true)
                            .frame(width: 96, height: 96)
                        Text(store.profile?.label ?? api.userName)
                            .font(.title2.bold())
                        if let email = store.profile?.email {
                            Text(email).font(.caption).foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 24)
                    .background(
                        LinearGradient(
                            colors: [Color.accentColor.opacity(0.3), .clear],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    HStack(spacing: 10) {
                        statCard("Liked", store.likedSongs.count, "heart.fill", route: .liked)
                        statCard("Playlists", store.playlists.count, "music.note.list", route: .collection(.playlists))
                        statCard("Following", store.followedArtists.count, "person.2.fill", route: .collection(.followed))
                    }
                    .padding(.horizontal)

                    VStack(spacing: 0) {
                        NavigationLink(value: Route.settings) {
                            profileRow("Settings", "gearshape")
                        }
                        .buttonStyle(.plain)
                        NavigationLink(value: Route.collection(.albums)) {
                            profileRow("Albums", "square.stack")
                        }
                        .buttonStyle(.plain)
                        NavigationLink(value: Route.collection(.followed)) {
                            profileRow("Followed artists", "person.2")
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal)

                    Text("Connected to \(api.normalizedBaseURL)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
                .padding(.bottom, 140)
            }
            .navigationBarTitleDisplayMode(.inline)
            .task { await store.loadIfNeeded() }
            .musicyDestinations()
        }
    }

    private func statCard(_ label: String, _ value: Int, _ symbol: String, route: Route) -> some View {
        NavigationLink(value: route) {
            VStack(spacing: 4) {
                Image(systemName: symbol).foregroundColor(.accentColor)
                Text("\(value)").font(.headline)
                Text(label).font(.caption).foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color("Surface"))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func profileRow(_ title: String, _ symbol: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol).frame(width: 22)
            Text(title)
            Spacer()
            Image(systemName: "chevron.right").font(.caption).foregroundColor(.secondary)
        }
        .padding(.vertical, 14)
    }
}
