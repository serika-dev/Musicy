import Foundation

/**
 The last few things the user searched for.

 An ordered array rather than a set, because order is the whole point — the
 most recent search has to come back first. Every mutating call returns the
 new list so callers can assign it straight into `@State`.
 */
enum SearchHistory {
    private static let key = "musicy.recentSearches"
    private static let maxEntries = 12
    private static let minLength = 2

    static func load() -> [String] {
        UserDefaults.standard.stringArray(forKey: key) ?? []
    }

    /// Moves an existing entry back to the top instead of duplicating it.
    @discardableResult
    static func add(_ query: String) -> [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= minLength else { return load() }
        var updated = load().filter { $0.caseInsensitiveCompare(trimmed) != .orderedSame }
        updated.insert(trimmed, at: 0)
        if updated.count > maxEntries { updated = Array(updated.prefix(maxEntries)) }
        UserDefaults.standard.set(updated, forKey: key)
        return updated
    }

    @discardableResult
    static func remove(_ query: String) -> [String] {
        let updated = load().filter { $0 != query }
        UserDefaults.standard.set(updated, forKey: key)
        return updated
    }

    @discardableResult
    static func clear() -> [String] {
        UserDefaults.standard.removeObject(forKey: key)
        return []
    }
}
