import Foundation

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case server(Int)
}

class MusicyAPI {
    static let shared = MusicyAPI()

    @Published var baseURL: String = UserDefaults.standard.string(forKey: "musicy_base_url") ?? "" {
        didSet { UserDefaults.standard.set(baseURL, forKey: "musicy_base_url") }
    }

    @Published var apiKey: String = UserDefaults.standard.string(forKey: "musicy_api_key") ?? "" {
        didSet { UserDefaults.standard.set(apiKey, forKey: "musicy_api_key") }
    }

    func fullURL(path: String) -> URL? {
        let normalized = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !normalized.isEmpty else { return nil }
        return URL(string: "\(normalized)/\(path)")
    }

    func request(path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let url = fullURL(path: path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode >= 400 { throw APIError.server(http.statusCode) }
        return data
    }

    func decode<T: Decodable>(_ type: T.Type, path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        let data = try await request(path: path, method: method, body: body)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    func getPublicSettings() async throws -> PublicSettingsResponse {
        try await decode(PublicSettingsResponse.self, path: "api/settings/public")
    }

    func getDailyMixes() async throws -> [DailyMix] {
        try await decode([DailyMix].self, path: "api/daily-mixes")
    }

    func getAlbums() async throws -> AlbumsResponse {
        try await decode(AlbumsResponse.self, path: "api/albums?limit=20")
    }

    func getAlbum(id: String) async throws -> Album {
        try await decode(Album.self, path: "api/albums/\(id)")
    }

    func getArtists() async throws -> ArtistsResponse {
        try await decode(ArtistsResponse.self, path: "api/artists?limit=20")
    }

    func getArtistTracks(id: String) async throws -> TracksResponse {
        try await decode(TracksResponse.self, path: "api/artists/\(id)/tracks?limit=50")
    }

    func getPlaylists() async throws -> PlaylistsResponse {
        try await decode(PlaylistsResponse.self, path: "api/playlists?limit=20")
    }

    func getPlaylist(id: String) async throws -> Playlist {
        try await decode(Playlist.self, path: "api/playlists/\(id)")
    }

    func search(query: String) async throws -> SearchResponse {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return try await decode(SearchResponse.self, path: "api/search?q=\(encoded)&limit=20")
    }

    func getTrack(id: String) async throws -> Track {
        try await decode(Track.self, path: "api/tracks/\(id)")
    }

    func recordPlay(trackId: String) async throws {
        let body = try JSONEncoder().encode(PlayRequest(trackId: trackId, duration: nil))
        _ = try await request(path: "api/track/play", method: "POST", body: body)
    }

    func getLikedSongs() async throws -> LikedSongsResponse {
        try await decode(LikedSongsResponse.self, path: "api/user/liked-songs?limit=50")
    }
}
