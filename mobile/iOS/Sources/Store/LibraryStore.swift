import Combine
import Foundation

/// Shared app state: the home feed, the user's library and the liked-song set
/// every heart icon reads from. Detail screens fetch their own data; this
/// holds what more than one screen needs.
@MainActor
final class LibraryStore: ObservableObject {
    static let shared = LibraryStore()

    @Published private(set) var feed: FeedResponse?
    @Published private(set) var dailyMixes: [DailyMix] = []
    @Published private(set) var genres: [Genre] = []
    @Published private(set) var playlists: [Playlist] = []
    @Published private(set) var likedSongs: [Track] = []
    @Published private(set) var likedIds: Set<String> = []
    @Published private(set) var followedArtists: [Artist] = []
    @Published private(set) var recentlyPlayed: [Track] = []
    @Published private(set) var albums: [Album] = []
    @Published private(set) var profile: User?

    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var toast: String?

    private var hasLoaded = false

    private init() {}

    func loadIfNeeded() async {
        guard !hasLoaded else { return }
        await reload()
    }

    func reload() async {
        guard MusicyAPI.shared.isAuthenticated else { return }
        isLoading = true
        errorMessage = nil
        let api = MusicyAPI.shared

        // Sequential rather than concurrent: each call is cheap, and a single
        // failure should never take the rest of the screen down with it.
        feed = (try? await api.getFeed()) ?? CatalogueCache.read(FeedResponse.self, key: CatalogueCache.feed)
        if let feed { CatalogueCache.write(feed, key: CatalogueCache.feed) }

        dailyMixes = (try? await api.getDailyMixes()) ?? CatalogueCache.read([DailyMix].self, key: CatalogueCache.dailyMixes) ?? []
        CatalogueCache.write(dailyMixes, key: CatalogueCache.dailyMixes)

        genres = (try? await api.getGenres()) ?? CatalogueCache.read([Genre].self, key: CatalogueCache.genres) ?? []
        CatalogueCache.write(genres, key: CatalogueCache.genres)

        playlists = (try? await api.getPlaylists())?.playlists
            ?? CatalogueCache.read([Playlist].self, key: CatalogueCache.playlists)
            ?? []
        CatalogueCache.write(playlists, key: CatalogueCache.playlists)

        let liked = (try? await api.getLikedSongs())?.tracks
            ?? CatalogueCache.read([Track].self, key: CatalogueCache.liked)
            ?? []
        likedSongs = liked
        likedIds = Set(liked.map(\.id))
        CatalogueCache.write(liked, key: CatalogueCache.liked)

        followedArtists = (try? await api.getFollowedArtists())
            ?? CatalogueCache.read([Artist].self, key: CatalogueCache.followed)
            ?? []
        CatalogueCache.write(followedArtists, key: CatalogueCache.followed)

        recentlyPlayed = (try? await api.getRecentlyPlayed())
            ?? CatalogueCache.read([Track].self, key: CatalogueCache.recent)
            ?? []
        CatalogueCache.write(recentlyPlayed, key: CatalogueCache.recent)

        albums = (try? await api.getAlbums())?.albums
            ?? CatalogueCache.read([Album].self, key: CatalogueCache.albums)
            ?? []
        CatalogueCache.write(albums, key: CatalogueCache.albums)

        profile = (try? await api.getProfile()) ?? CatalogueCache.read(User.self, key: CatalogueCache.profile)
        if let profile { CatalogueCache.write(profile, key: CatalogueCache.profile) }

        if feed == nil, likedSongs.isEmpty, albums.isEmpty {
            errorMessage = "Couldn't reach the server. Pull to refresh once you're back online."
        }

        hasLoaded = true
        isLoading = false
    }

    /// Pulls library metadata onto disk so the app can be browsed offline.
    func syncLibraryForOffline() async {
        toast = "Saving library for offline…"
        await reload()
        for playlist in playlists {
            if let full = try? await MusicyAPI.shared.getPlaylist(id: playlist.id) {
                CatalogueCache.write(full, key: CatalogueCache.playlist(playlist.id))
            }
        }
        for artist in followedArtists {
            _ = try? await MusicyAPI.shared.getArtist(id: artist.id)
            _ = try? await MusicyAPI.shared.getAllArtistTracks(id: artist.id)
        }
        toast = "Library saved for offline"
    }

    func isLiked(_ trackId: String) -> Bool { likedIds.contains(trackId) }

    /// Flips the heart immediately and rolls back if the server disagrees.
    func toggleLike(_ track: Track) {
        let wasLiked = likedIds.contains(track.id)
        if wasLiked {
            likedIds.remove(track.id)
            likedSongs.removeAll { $0.id == track.id }
        } else {
            likedIds.insert(track.id)
            likedSongs.insert(track, at: 0)
        }

        Task {
            do {
                if wasLiked {
                    try await MusicyAPI.shared.unlikeTrack(id: track.id)
                } else {
                    try await MusicyAPI.shared.likeTrack(id: track.id)
                }
                toast = wasLiked ? "Removed from Liked Songs" : "Added to Liked Songs"
            } catch {
                if wasLiked {
                    likedIds.insert(track.id)
                    likedSongs.insert(track, at: 0)
                } else {
                    likedIds.remove(track.id)
                    likedSongs.removeAll { $0.id == track.id }
                }
                toast = "Couldn't update Liked Songs"
            }
        }
    }

    func createPlaylist(named name: String) async -> Playlist? {
        do {
            let playlist = try await MusicyAPI.shared.createPlaylist(name: name)
            playlists.insert(playlist, at: 0)
            toast = "Created \"\(playlist.name)\""
            return playlist
        } catch {
            toast = "Couldn't create the playlist"
            return nil
        }
    }

    func addToPlaylist(_ playlist: Playlist, track: Track) {
        Task {
            do {
                try await MusicyAPI.shared.addToPlaylist(playlistId: playlist.id, trackIds: [track.id])
                toast = "Added to \(playlist.name)"
            } catch {
                toast = "Couldn't add to the playlist"
            }
        }
    }

    func setFollowing(_ artistId: String, follow: Bool) async -> Bool {
        do {
            try await MusicyAPI.shared.setFollowing(id: artistId, follow: follow)
            if follow {
                if !followedArtists.contains(where: { $0.id == artistId }) {
                    if let artist = try? await MusicyAPI.shared.getArtist(id: artistId) {
                        followedArtists.insert(artist, at: 0)
                    }
                }
            } else {
                followedArtists.removeAll { $0.id == artistId }
            }
            return follow
        } catch {
            return !follow
        }
    }

    func signOut() {
        AudioPlayer.shared.stop()
        MusicyAPI.shared.signOut()
        // The next person to sign in on this device should not inherit the
        // last account's searches.
        SearchHistory.clear()
        feed = nil
        dailyMixes = []
        genres = []
        playlists = []
        likedSongs = []
        likedIds = []
        followedArtists = []
        recentlyPlayed = []
        albums = []
        profile = nil
        hasLoaded = false
    }
}
