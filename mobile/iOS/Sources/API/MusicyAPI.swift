import Combine
import Foundation

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case server(Int)

    /// Message worth putting in front of a person.
    var friendlyMessage: String {
        switch self {
        case .invalidURL: return "That server address doesn't look right."
        case .invalidResponse: return "The server sent something unexpected."
        case let .server(code):
            switch code {
            case 401, 403: return "Your session expired. Sign in again from Settings."
            case 404: return "Not found on this server."
            case 500...599: return "The server had a problem. Try again shortly."
            default: return "Request failed (\(code))."
            }
        }
    }
}

/// The full Musicy HTTP surface, plus the credentials the app was set up with.
final class MusicyAPI: ObservableObject {
    static let shared = MusicyAPI()

    @Published var baseURL: String = UserDefaults.standard.string(forKey: "musicy_base_url") ?? "" {
        didSet { UserDefaults.standard.set(baseURL, forKey: "musicy_base_url") }
    }

    @Published var apiKey: String = UserDefaults.standard.string(forKey: "musicy_api_key") ?? "" {
        didSet { UserDefaults.standard.set(apiKey, forKey: "musicy_api_key") }
    }

    @Published var userName: String = UserDefaults.standard.string(forKey: "musicy_user_name") ?? "" {
        didSet { UserDefaults.standard.set(userName, forKey: "musicy_user_name") }
    }

    var isAuthenticated: Bool { !baseURL.isEmpty && !apiKey.isEmpty }

    var normalizedBaseURL: String {
        var trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while trimmed.hasSuffix("/") { trimmed.removeLast() }
        return trimmed
    }

    func signOut() {
        apiKey = ""
        userName = ""
    }

    func fullURL(path: String) -> URL? {
        let normalized = normalizedBaseURL
        guard !normalized.isEmpty else { return nil }
        return URL(string: "\(normalized)/\(path)")
    }

    /// Turns a possibly-relative API value (cover art, audio file) into a URL
    /// the player and `AsyncImage` can actually fetch.
    func absoluteURL(_ value: String?) -> URL? {
        guard let value, !value.isEmpty else { return nil }
        if value.hasPrefix("http://") || value.hasPrefix("https://") || value.hasPrefix("file://") {
            return URL(string: value)
        }
        let base = normalizedBaseURL
        guard !base.isEmpty else { return nil }
        return URL(string: value.hasPrefix("/") ? base + value : "\(base)/\(value)")
    }

    /// Quality-aware streaming URL. The endpoint 302-redirects to the rendition
    /// matching `quality` (falling back to the original when none exist yet).
    func streamURL(trackId: String, quality: String) -> URL? {
        let base = normalizedBaseURL
        guard !base.isEmpty else { return nil }
        let q = quality.isEmpty ? "auto" : quality
        return URL(string: "\(base)/api/tracks/\(trackId)/stream?quality=\(q)")
    }

    func makeRequest(path: String, method: String = "GET", body: Data? = nil) -> URLRequest? {
        guard let url = fullURL(path: path) else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        return request
    }

    @discardableResult
    func request(path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let request = makeRequest(path: path, method: method, body: body) else { throw APIError.invalidURL }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode >= 400 { throw APIError.server(http.statusCode) }
        return data
    }

    func decode<T: Decodable>(_ type: T.Type, path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        let data = try await request(path: path, method: method, body: body)
        // The API already speaks camelCase, so key conversion would only
        // mangle keys like `_count`.
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(LoginRequest(email: email, password: password))
        return try await decode(AuthResponse.self, path: "api/mobile/login", method: "POST", body: body)
    }

    func register(email: String, password: String, username: String, displayName: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(
            RegisterRequest(email: email, password: password, username: username, displayName: displayName)
        )
        let data = try await request(path: "api/auth/register", method: "POST", body: body)
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }

    func getPublicSettings() async throws -> PublicSettingsResponse {
        try await decode(PublicSettingsResponse.self, path: "api/settings/public")
    }

    func getProfile() async throws -> User {
        try await decode(User.self, path: "api/user/profile")
    }

    func getUserSettings() async throws -> UserSettings {
        try await decode(UserSettings.self, path: "api/user/settings")
    }

    func putUserSettings(_ settings: UserSettings) async throws {
        let body = try JSONEncoder().encode(settings)
        try await request(path: "api/user/settings", method: "PUT", body: body)
    }

    // MARK: - Home

    func getFeed() async throws -> FeedResponse {
        try await decode(FeedResponse.self, path: "api/mobile/feed")
    }

    func getDailyMixes() async throws -> [DailyMix] {
        try await decode([DailyMix].self, path: "api/daily-mixes")
    }

    func getDailyMix(id: String) async throws -> DailyMix {
        try await decode(DailyMix.self, path: "api/daily-mixes/\(id)")
    }

    func getGenres() async throws -> [Genre] {
        try await decode(GenresResponse.self, path: "api/genres").genres
    }

    // MARK: - Catalogue

    func getAlbums(limit: Int = 40, offset: Int = 0, genre: String? = nil) async throws -> AlbumsResponse {
        var path = "api/albums?limit=\(limit)&offset=\(offset)"
        if let genre, let encoded = genre.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&genre=\(encoded)"
        }
        return try await decode(AlbumsResponse.self, path: path)
    }

    func getAlbum(id: String) async throws -> Album {
        try await decode(Album.self, path: "api/albums/\(id)")
    }

    func getArtists(limit: Int = 40, offset: Int = 0) async throws -> ArtistsResponse {
        try await decode(ArtistsResponse.self, path: "api/artists?limit=\(limit)&offset=\(offset)")
    }

    func getArtist(id: String) async throws -> Artist {
        try await decode(Artist.self, path: "api/artists/\(id)")
    }

    func getArtistTracks(id: String, limit: Int = 100) async throws -> TracksResponse {
        try await decode(TracksResponse.self, path: "api/artists/\(id)/tracks?limit=\(limit)")
    }

    func getArtistAlbums(id: String, limit: Int = 50) async throws -> AlbumsResponse {
        try await decode(AlbumsResponse.self, path: "api/artists/\(id)/albums?limit=\(limit)")
    }

    func getFollowState(id: String) async throws -> Bool {
        try await decode(FollowResponse.self, path: "api/artists/\(id)/follow").isFollowing
    }

    func setFollowing(id: String, follow: Bool) async throws {
        try await request(path: "api/artists/\(id)/follow", method: follow ? "POST" : "DELETE")
    }

    func getTracks(limit: Int = 100, offset: Int = 0, genre: String? = nil) async throws -> TracksResponse {
        var path = "api/tracks?limit=\(limit)&offset=\(offset)"
        if let genre, let encoded = genre.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&genre=\(encoded)"
        }
        return try await decode(TracksResponse.self, path: path)
    }

    func getTrack(id: String) async throws -> Track {
        try await decode(Track.self, path: "api/tracks/\(id)")
    }

    func getLyrics(trackId: String) async throws -> LyricsResponse {
        try await decode(LyricsResponse.self, path: "api/tracks/\(trackId)/lyrics")
    }

    /// `mode` is "synced" or "plain", matching the lyrics being displayed.
    func romanizeLyrics(trackId: String, mode: String, language: String?) async throws -> String {
        let body = try JSONEncoder().encode(
            RomanizeRequest(trackId: trackId, mode: mode, language: language)
        )
        return try await decode(
            RomanizeResponse.self,
            path: "api/lyrics/romanize",
            method: "POST",
            body: body
        ).romanized
    }

    func search(query: String) async throws -> SearchResponse {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return try await decode(SearchResponse.self, path: "api/search?q=\(encoded)&limit=20")
    }

    // MARK: - Playlists

    func getPlaylists(limit: Int = 50) async throws -> PlaylistsResponse {
        try await decode(PlaylistsResponse.self, path: "api/playlists?limit=\(limit)")
    }

    func getPlaylist(id: String) async throws -> Playlist {
        try await decode(Playlist.self, path: "api/playlists/\(id)")
    }

    func createPlaylist(name: String) async throws -> Playlist {
        let body = try JSONEncoder().encode(CreatePlaylistRequest(name: name, description: nil, isPublic: true))
        return try await decode(Playlist.self, path: "api/playlists", method: "POST", body: body)
    }

    func addToPlaylist(playlistId: String, trackIds: [String]) async throws {
        let body = try JSONEncoder().encode(PlaylistTracksRequest(trackIds: trackIds))
        try await request(path: "api/playlists/\(playlistId)/tracks", method: "POST", body: body)
    }

    func removeFromPlaylist(playlistId: String, trackIds: [String]) async throws {
        let body = try JSONEncoder().encode(PlaylistTracksRequest(trackIds: trackIds))
        try await request(path: "api/playlists/\(playlistId)/tracks", method: "DELETE", body: body)
    }

    // MARK: - Library

    func getLikedSongs(limit: Int = 200) async throws -> LikedSongsResponse {
        try await decode(LikedSongsResponse.self, path: "api/mobile/liked-songs?limit=\(limit)")
    }

    func likeTrack(id: String) async throws {
        let body = try JSONEncoder().encode(LikeRequest(trackId: id))
        try await request(path: "api/user/liked-songs", method: "POST", body: body)
    }

    func unlikeTrack(id: String) async throws {
        try await request(path: "api/user/liked-songs?trackId=\(id)", method: "DELETE")
    }

    func getRecentlyPlayed() async throws -> [Track] {
        try await decode(RecentlyPlayedResponse.self, path: "api/user/recently-played").tracks
    }

    func getFollowedArtists(limit: Int = 50) async throws -> [Artist] {
        try await decode(ArtistsResponse.self, path: "api/user/followed-artists?limit=\(limit)").artists
    }

    func recordPlay(trackId: String, seconds: Int? = nil) async throws {
        let body = try JSONEncoder().encode(PlayRequest(trackId: trackId, duration: seconds))
        try await request(path: "api/track/play", method: "POST", body: body)
    }

    // MARK: - Sync

    func getDevices() async throws -> [SyncDevice] {
        try await decode(DevicesResponse.self, path: "api/sync/devices").devices
    }

    func publishSync(_ payload: [String: Any]) async {
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        _ = try? await request(path: "api/sync/publish", method: "POST", body: body)
    }
}
