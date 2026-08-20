import Foundation

/// Disk cache of catalogue JSON so Home, Library and artist pages keep working
/// with the radio off. Mirrors Android `CatalogueCache`.
enum CatalogueCache {
    private static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let dir = base.appendingPathComponent("catalogue", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func read<T: Decodable>(_ type: T.Type, key: String) -> T? {
        let url = file(for: key)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    static func write<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: file(for: key), options: .atomic)
    }

    static func clear() {
        try? FileManager.default.removeItem(at: directory)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    private static func file(for key: String) -> URL {
        let safe = key.replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
        return directory.appendingPathComponent("\(safe).json")
    }

    static let feed = "feed"
    static let dailyMixes = "daily-mixes"
    static let genres = "genres"
    static let liked = "liked"
    static let playlists = "playlists"
    static let followed = "followed"
    static let recent = "recent"
    static let albums = "albums"
    static let profile = "profile"
    static func artist(_ id: String) -> String { "artist-\(id)" }
    static func artistTracks(_ id: String) -> String { "artist-tracks-\(id)" }
    static func album(_ id: String) -> String { "album-\(id)" }
    static func playlist(_ id: String) -> String { "playlist-\(id)" }
}
