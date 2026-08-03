import Foundation

struct Track: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let duration: Int?
    let coverImageUrl: String?
    let filePath: String?
    let format: String?
    let genre: String?
    let playCount: Int?
    let trackNumber: Int?
    let artist: Artist?
    let album: Album?
    let featuredArtists: [Artist]?

    init(
        id: String,
        title: String,
        duration: Int? = nil,
        coverImageUrl: String? = nil,
        filePath: String? = nil,
        format: String? = nil,
        genre: String? = nil,
        playCount: Int? = nil,
        trackNumber: Int? = nil,
        artist: Artist? = nil,
        album: Album? = nil,
        featuredArtists: [Artist]? = nil
    ) {
        self.id = id
        self.title = title
        self.duration = duration
        self.coverImageUrl = coverImageUrl
        self.filePath = filePath
        self.format = format
        self.genre = genre
        self.playCount = playCount
        self.trackNumber = trackNumber
        self.artist = artist
        self.album = album
        self.featuredArtists = featuredArtists
    }

    /// Track art first, then the album's — the order the web player uses.
    var artworkUrl: String? { coverImageUrl ?? album?.coverImageUrl ?? artist?.imageUrl }

    /// "Artist, Feature A & Feature B".
    var artistLine: String {
        var names: [String] = []
        if let artist { names.append(artist.name) }
        names.append(contentsOf: featuredArtists?.map(\.name) ?? [])
        switch names.count {
        case 0: return "Unknown artist"
        case 1: return names[0]
        default: return names.dropLast().joined(separator: ", ") + " & " + names[names.count - 1]
        }
    }

    static func == (lhs: Track, rhs: Track) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Artist: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let imageUrl: String?
    let bannerUrl: String?
    let verified: Bool?
    let bio: String?
    let isFollowing: Bool?
    let members: [Artist]?
    let topTracks: [Track]?
    let albums: [Album]?
    let _count: Count?

    static func == (lhs: Artist, rhs: Artist) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Album: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let coverImageUrl: String?
    let releaseDate: String?
    let genre: String?
    let albumType: String?
    let description: String?
    let artist: Artist?
    let tracks: [Track]?
    let _count: Count?

    var trackCount: Int { tracks?.count ?? _count?.tracks ?? 0 }
    var year: String? {
        guard let releaseDate, releaseDate.count >= 4 else { return nil }
        return String(releaseDate.prefix(4))
    }

    static func == (lhs: Album, rhs: Album) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Count: Codable {
    let tracks: Int?
    let albums: Int?
    let followers: Int?
    let playlists: Int?
}

struct Playlist: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let coverImageUrl: String?
    let isPublic: Bool?
    let owner: User?
    let tracks: [PlaylistTrack]?
    let _count: Count?

    var trackCount: Int { tracks?.count ?? _count?.tracks ?? 0 }
    var trackList: [Track] { tracks?.map(\.track) ?? [] }

    static func == (lhs: Playlist, rhs: Playlist) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PlaylistTrack: Codable {
    let id: String?
    let position: Int?
    let track: Track
}

struct DailyMix: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let coverImageUrl: String?
    let genre: String?
    let tracks: [Track]?

    var trackCount: Int { tracks?.count ?? 0 }

    static func == (lhs: DailyMix, rhs: DailyMix) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Genre: Codable, Identifiable, Hashable {
    let name: String
    let count: Int?

    var id: String { name }
}

struct GenresResponse: Codable {
    let genres: [Genre]
}

struct AlbumsResponse: Codable {
    let albums: [Album]
    let total: Int?
    let limit: Int?
    let offset: Int?
    let hasMore: Bool?
}

struct ArtistsResponse: Codable {
    let artists: [Artist]
    let total: Int?
    let limit: Int?
    let offset: Int?
}

struct TracksResponse: Codable {
    let tracks: [Track]
    let total: Int?
    let limit: Int?
    let offset: Int?
    let hasMore: Bool?
}

struct PlaylistsResponse: Codable {
    let playlists: [Playlist]
    let total: Int?
    let limit: Int?
    let offset: Int?
    let hasMore: Bool?
}

struct Paged<T: Codable>: Codable {
    let items: [T]
    let total: Int?
    let limit: Int?
    let offset: Int?
}

struct SearchResponse: Codable {
    let tracks: Paged<Track>?
    let albums: Paged<Album>?
    let artists: Paged<Artist>?
    let playlists: Paged<Playlist>?

    var isEmpty: Bool {
        (tracks?.items.isEmpty ?? true) &&
            (albums?.items.isEmpty ?? true) &&
            (artists?.items.isEmpty ?? true) &&
            (playlists?.items.isEmpty ?? true)
    }
}

struct PublicSettingsResponse: Codable {
    let settings: [String: String]
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let username: String
    let displayName: String
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct AuthResponse: Codable {
    let message: String?
    let apiKey: String?
    let user: User?
}

struct User: Codable, Identifiable {
    let id: String
    let email: String?
    let username: String?
    let displayName: String?
    let avatarUrl: String?
    let bannerUrl: String?
    let role: String?

    var label: String {
        displayName ?? username ?? email?.components(separatedBy: "@").first ?? "You"
    }
}

struct PlayRequest: Codable {
    let trackId: String
    let duration: Int?
}

struct LikeRequest: Codable {
    let trackId: String
}

struct CreatePlaylistRequest: Codable {
    let name: String
    let description: String?
    let isPublic: Bool
}

struct PlaylistTracksRequest: Codable {
    let trackIds: [String]
}

struct FollowResponse: Codable {
    let isFollowing: Bool
}

struct LyricsResponse: Codable {
    let lrcId: Int?
    let plainLyrics: String?
    let syncedLyrics: String?

    var hasAnything: Bool {
        !(plainLyrics ?? "").isEmpty || !(syncedLyrics ?? "").isEmpty
    }
}

struct LikedSongsResponse: Codable {
    let tracks: [Track]
    let total: Int?
    let limit: Int?
    let offset: Int?
    let hasMore: Bool?
}

struct RecentlyPlayedResponse: Codable {
    let tracks: [Track]
}

struct FeedResponse: Codable {
    let featuredAlbum: Album?
    let followedAlbums: [Album]
    let recommendedTracks: [Track]
    let discoverAlbums: [Album]
    let likedGenres: [String]
    let followedArtistCount: Int?
    let recentlyPlayed: [Track]
    let topArtists: [Artist]
    let recommendedArtists: [Artist]
    let newReleases: [Album]
}

// MARK: - Multi-device sync (mirrors src/lib/sync-bus.ts)

struct SyncDevice: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let isActive: Bool?
    let lastSeenAt: String?
}

struct DevicesResponse: Codable {
    let devices: [SyncDevice]
}

struct DeviceListEvent: Codable {
    struct Payload: Codable {
        let devices: [SyncDevice]
    }

    let payload: Payload
}

struct SyncStateEvent: Codable {
    struct Payload: Codable {
        let trackId: String?
        let currentTrack: Track?
        let isPlaying: Bool?
        let currentTime: Double?
        let duration: Double?
        let currentIndex: Int?
        let activeDeviceId: String?
    }

    let fromDeviceId: String?
    let payload: Payload
}

struct SyncCommandEvent: Codable {
    struct Payload: Codable {
        let action: String
        let seconds: Double?
        let volume: Double?
        let trackId: String?
    }

    let fromDeviceId: String?
    let targetDeviceId: String?
    let payload: Payload
}

struct SyncClaimEvent: Codable {
    struct Payload: Codable {
        let deviceName: String?
    }

    let fromDeviceId: String?
    let payload: Payload?
}
