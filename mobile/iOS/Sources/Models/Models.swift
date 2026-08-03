import Foundation

struct Track: Codable, Identifiable {
    let id: String
    let title: String
    let duration: Int?
    let coverImageUrl: String?
    let filePath: String?
    let format: String?
    let genre: String?
    let playCount: Int?
    let artist: Artist?
    let album: Album?
    let featuredArtists: [Artist]?
}

struct Artist: Codable, Identifiable {
    let id: String
    let name: String
    let imageUrl: String?
    let verified: Bool?
    let bio: String?
}

struct Album: Codable, Identifiable {
    let id: String
    let title: String
    let coverImageUrl: String?
    let releaseDate: String?
    let genre: String?
    let albumType: String?
    let artist: Artist?
    let tracks: [Track]?
    let _count: Count?
}

struct Count: Codable {
    let tracks: Int?
    let albums: Int?
    let followers: Int?
}

struct Playlist: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let coverImageUrl: String?
    let isPublic: Bool?
    let tracks: [PlaylistTrack]?
    let _count: Count?
}

struct PlaylistTrack: Codable {
    let id: String
    let position: Int
    let track: Track
}

struct DailyMix: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let coverImageUrl: String?
    let tracks: [Track]?
}

struct AlbumsResponse: Codable {
    let albums: [Album]
    let total: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
}

struct ArtistsResponse: Codable {
    let artists: [Artist]
    let total: Int
    let limit: Int
    let offset: Int
}

struct TracksResponse: Codable {
    let tracks: [Track]
    let total: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
}

struct PlaylistsResponse: Codable {
    let playlists: [Playlist]
    let total: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
}

struct Paged<T: Codable>: Codable {
    let items: [T]
    let total: Int
    let limit: Int
    let offset: Int
}

struct SearchResponse: Codable {
    let tracks: Paged<Track>?
    let albums: Paged<Album>?
    let artists: Paged<Artist>?
    let playlists: Paged<Playlist>?
}

struct PublicSettingsResponse: Codable {
    let settings: [String: String]
}

struct PlayRequest: Codable {
    let trackId: String
    let duration: Int?
}

struct LikedSongsResponse: Codable {
    let tracks: [Track]
    let total: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
}
