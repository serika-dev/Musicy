import SwiftUI

private enum SearchFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case songs = "Songs"
    case albums = "Albums"
    case artists = "Artists"
    case playlists = "Playlists"

    var id: String { rawValue }
}

struct SearchView: View {
    @ObservedObject private var store = LibraryStore.shared
    @ObservedObject private var player = AudioPlayer.shared
    @State private var query = ""
    @State private var filter: SearchFilter = .all
    @State private var results: SearchResponse?
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @State private var actionTrack: Track?

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if query.isEmpty {
                        browseAll
                    } else if isSearching {
                        ProgressView().frame(maxWidth: .infinity).padding(40)
                    } else if let results {
                        if results.isEmpty {
                            EmptyStateView(
                                title: "No results for “\(query)”",
                                message: "Check the spelling, or try a different artist or album.",
                                systemImage: "magnifyingglass"
                            )
                        } else {
                            resultSections(results)
                        }
                    }
                }
                .padding(.vertical)
                .padding(.bottom, 140)
            }
            .navigationTitle("Search")
            .searchable(text: $query, prompt: "Songs, albums, artists, playlists")
            .onChange(of: query) { _, newValue in scheduleSearch(newValue) }
            .safeAreaInset(edge: .top) {
                if !query.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(SearchFilter.allCases) { option in
                                Button {
                                    filter = option
                                } label: {
                                    Text(option.rawValue)
                                        .font(.subheadline.bold())
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(option == filter ? Color.accentColor : Color("Surface"))
                                        .foregroundColor(option == filter ? .white : .primary)
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 6)
                    }
                    .background(.bar)
                }
            }
            .task { await store.loadIfNeeded() }
            .musicyDestinations()
            .sheet(item: $actionTrack) { TrackActionsSheet(track: $0) }
        }
    }

    /// The genre grid the web app shows on an empty search.
    private var browseAll: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Browse all").font(.title2.bold()).padding(.horizontal)
            if store.genres.isEmpty {
                EmptyStateView(
                    title: "Search Musicy",
                    message: "Find songs, albums, artists and playlists across the library.",
                    systemImage: "magnifyingglass"
                )
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(store.genres) { genre in
                        NavigationLink(value: Route.genre(genre.name)) {
                            CategoryTile(name: genre.name, count: genre.count)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    @ViewBuilder
    private func resultSections(_ results: SearchResponse) -> some View {
        let tracks = results.tracks?.items ?? []
        if (filter == .all || filter == .songs), !tracks.isEmpty {
            SectionHeader("Songs")
            VStack(spacing: 0) {
                ForEach(Array(tracks.enumerated()), id: \.element.id) { index, track in
                    TrackRow(
                        track: track,
                        isCurrent: player.currentTrack?.id == track.id,
                        action: { player.play(tracks: tracks, startAt: index) },
                        onMore: { actionTrack = track }
                    )
                }
            }
            .padding(.horizontal)
        }

        let albums = results.albums?.items ?? []
        if (filter == .all || filter == .albums), !albums.isEmpty {
            SectionHeader("Albums")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(albums) { album in
                        NavigationLink(value: Route.album(album.id)) {
                            MediaCard(imageURL: album.coverImageUrl, title: album.title, subtitle: album.artist?.name)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }

        let artists = results.artists?.items ?? []
        if (filter == .all || filter == .artists), !artists.isEmpty {
            SectionHeader("Artists")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(artists) { artist in
                        NavigationLink(value: Route.artist(artist.id)) {
                            MediaCard(
                                imageURL: artist.imageUrl,
                                title: artist.name,
                                subtitle: "Artist",
                                circular: true,
                                systemImage: "person.fill"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }

        let playlists = results.playlists?.items ?? []
        if (filter == .all || filter == .playlists), !playlists.isEmpty {
            SectionHeader("Playlists")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(playlists) { playlist in
                        NavigationLink(value: Route.playlist(playlist.id)) {
                            MediaCard(
                                imageURL: playlist.coverImageUrl,
                                title: playlist.name,
                                subtitle: "\(playlist.trackCount) tracks",
                                systemImage: "music.note.list"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    /// Debounced so typing doesn't fire a request per keystroke.
    private func scheduleSearch(_ text: String) {
        searchTask?.cancel()
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = nil
            isSearching = false
            return
        }
        isSearching = true
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            results = try? await MusicyAPI.shared.search(query: text)
            isSearching = false
        }
    }
}
