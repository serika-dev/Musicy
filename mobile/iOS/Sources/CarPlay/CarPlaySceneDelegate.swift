import CarPlay
import UIKit

/// CarPlay browse UI. Mirrors the Android Auto tree so the two cars offer the
/// same catalogue: mixes, albums, artists, playlists, genres, liked songs and
/// recently played.
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        self.interfaceController = interfaceController
        interfaceController.setRootTemplate(makeRootTemplate(), animated: true, completion: nil)
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        self.interfaceController = nil
    }

    // MARK: - Root

    private func makeRootTemplate() -> CPListTemplate {
        let entries: [(String, String, () -> Void)] = [
            ("Daily Mixes", "Mixes made for you", { [weak self] in self?.pushDailyMixes() }),
            ("Liked Songs", "Your liked tracks", { [weak self] in self?.pushLikedSongs() }),
            ("Recently played", "Pick up where you left off", { [weak self] in self?.pushRecentlyPlayed() }),
            ("Albums", "Browse albums", { [weak self] in self?.pushAlbums() }),
            ("Artists", "Browse artists", { [weak self] in self?.pushArtists() }),
            ("Playlists", "Community playlists", { [weak self] in self?.pushPlaylists() }),
            ("Genres", "Browse by category", { [weak self] in self?.pushGenres() })
        ]

        let items = entries.map { title, detail, action -> CPListItem in
            let item = CPListItem(text: title, detailText: detail)
            item.handler = { _, completion in
                action()
                completion()
            }
            return item
        }

        return CPListTemplate(title: "Musicy", sections: [CPListSection(items: items)])
    }

    // MARK: - Browse nodes

    private func pushDailyMixes() {
        loadAndPush(title: "Daily Mixes") {
            let mixes = try await MusicyAPI.shared.getDailyMixes()
            return mixes.map { mix in
                self.browseItem(title: mix.name, detail: mix.description ?? "\(mix.trackCount) tracks") {
                    self.pushTracks(mix.tracks ?? [], title: mix.name)
                }
            }
        }
    }

    private func pushAlbums() {
        loadAndPush(title: "Albums") {
            let albums = try await MusicyAPI.shared.getAlbums(limit: 50).albums
            return albums.map { album in
                self.browseItem(title: album.title, detail: album.artist?.name) {
                    Task {
                        let full = try? await MusicyAPI.shared.getAlbum(id: album.id)
                        await MainActor.run { self.pushTracks(full?.tracks ?? [], title: album.title) }
                    }
                }
            }
        }
    }

    private func pushArtists() {
        loadAndPush(title: "Artists") {
            let artists = try await MusicyAPI.shared.getArtists(limit: 50).artists
            return artists.map { artist in
                self.browseItem(title: artist.name, detail: artist._count?.tracks.map { "\($0) tracks" }) {
                    Task {
                        let tracks = (try? await MusicyAPI.shared.getArtistTracks(id: artist.id))?.tracks ?? []
                        await MainActor.run { self.pushTracks(tracks, title: artist.name) }
                    }
                }
            }
        }
    }

    private func pushPlaylists() {
        loadAndPush(title: "Playlists") {
            let playlists = try await MusicyAPI.shared.getPlaylists(limit: 50).playlists
            return playlists.map { playlist in
                self.browseItem(title: playlist.name, detail: "\(playlist.trackCount) tracks") {
                    Task {
                        let full = try? await MusicyAPI.shared.getPlaylist(id: playlist.id)
                        await MainActor.run { self.pushTracks(full?.trackList ?? [], title: playlist.name) }
                    }
                }
            }
        }
    }

    private func pushGenres() {
        loadAndPush(title: "Genres") {
            let genres = try await MusicyAPI.shared.getGenres()
            return genres.map { genre in
                self.browseItem(title: genre.name, detail: genre.count.map { "\($0) tracks" }) {
                    Task {
                        let tracks = (try? await MusicyAPI.shared.getTracks(limit: 100, genre: genre.name))?.tracks ?? []
                        await MainActor.run { self.pushTracks(tracks, title: genre.name) }
                    }
                }
            }
        }
    }

    private func pushLikedSongs() {
        loadTracksAndPush(title: "Liked Songs") {
            try await MusicyAPI.shared.getLikedSongs(limit: 100).tracks
        }
    }

    private func pushRecentlyPlayed() {
        loadTracksAndPush(title: "Recently played") {
            try await MusicyAPI.shared.getRecentlyPlayed()
        }
    }

    // MARK: - Helpers

    private func browseItem(title: String, detail: String?, action: @escaping () -> Void) -> CPListItem {
        let item = CPListItem(text: title, detailText: detail)
        item.handler = { _, completion in
            action()
            completion()
        }
        return item
    }

    private func loadAndPush(title: String, build: @escaping () async throws -> [CPListItem]) {
        Task {
            guard let items = try? await build() else { return }
            await MainActor.run {
                let template = CPListTemplate(title: title, sections: [CPListSection(items: items)])
                self.interfaceController?.pushTemplate(template, animated: true, completion: nil)
            }
        }
    }

    private func loadTracksAndPush(title: String, load: @escaping () async throws -> [Track]) {
        Task {
            guard let tracks = try? await load() else { return }
            await MainActor.run { self.pushTracks(tracks, title: title) }
        }
    }

    /// Shows the track list itself so a driver can pick a specific song rather
    /// than only being able to start the whole list.
    private func pushTracks(_ tracks: [Track], title: String) {
        guard !tracks.isEmpty else { return }

        var items: [CPListItem] = []

        let playAll = CPListItem(text: "Play all", detailText: "\(tracks.count) tracks")
        playAll.handler = { [weak self] _, completion in
            AudioPlayer.shared.play(tracks: tracks)
            self?.showNowPlaying()
            completion()
        }
        items.append(playAll)

        let shuffle = CPListItem(text: "Shuffle", detailText: "Random order")
        shuffle.handler = { [weak self] _, completion in
            AudioPlayer.shared.play(tracks: tracks.shuffled())
            self?.showNowPlaying()
            completion()
        }
        items.append(shuffle)

        for (index, track) in tracks.enumerated() {
            let item = CPListItem(text: track.title, detailText: track.artistLine)
            item.handler = { [weak self] _, completion in
                AudioPlayer.shared.play(tracks: tracks, startAt: index)
                self?.showNowPlaying()
                completion()
            }
            items.append(item)
        }

        let template = CPListTemplate(title: title, sections: [CPListSection(items: items)])
        interfaceController?.pushTemplate(template, animated: true, completion: nil)
    }

    private func showNowPlaying() {
        let nowPlaying = CPNowPlayingTemplate.shared
        DispatchQueue.main.async {
            self.interfaceController?.pushTemplate(nowPlaying, animated: true, completion: nil)
        }
    }
}
