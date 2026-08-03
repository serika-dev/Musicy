import CarPlay
import UIKit

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController, to window: CPWindow) {
        self.interfaceController = interfaceController
        let root = createRootTemplate()
        interfaceController.setRootTemplate(root, animated: true, completion: nil)
    }

    private func createRootTemplate() -> CPListTemplate {
        var items: [CPListItem] = []

        let dailyMixes = CPListItem(text: "Daily Mixes", detailText: "Mixes made for you")
        dailyMixes.handler = { [weak self] _, completion in
            self?.pushDailyMixes()
            completion()
        }
        items.append(dailyMixes)

        let albums = CPListItem(text: "Albums", detailText: "Browse albums")
        albums.handler = { [weak self] _, completion in
            self?.pushAlbums()
            completion()
        }
        items.append(albums)

        let artists = CPListItem(text: "Artists", detailText: "Browse artists")
        artists.handler = { [weak self] _, completion in
            self?.pushArtists()
            completion()
        }
        items.append(artists)

        let playlists = CPListItem(text: "Playlists", detailText: "Community playlists")
        playlists.handler = { [weak self] _, completion in
            self?.pushPlaylists()
            completion()
        }
        items.append(playlists)

        let liked = CPListItem(text: "Liked Songs", detailText: "Your liked tracks")
        liked.handler = { [weak self] _, completion in
            self?.pushLiked()
            completion()
        }
        items.append(liked)

        let section = CPListSection(items: items)
        return CPListTemplate(title: "Musicy", sections: [section])
    }

    private func pushDailyMixes() {
        Task {
            do {
                let mixes = try await MusicyAPI.shared.getDailyMixes()
                let items = mixes.map { mix -> CPListItem in
                    let item = CPListItem(text: mix.name, detailText: mix.description)
                    item.handler = { [weak self] _, completion in
                        self?.playTracks(mix.tracks ?? [])
                        completion()
                    }
                    return item
                }
                let template = CPListTemplate(title: "Daily Mixes", sections: [CPListSection(items: items)])
                await MainActor.run { self.interfaceController?.pushTemplate(template, animated: true, completion: nil) }
            } catch {}
        }
    }

    private func pushAlbums() {
        Task {
            do {
                let albums = try await MusicyAPI.shared.getAlbums().albums
                let items = albums.map { album -> CPListItem in
                    let item = CPListItem(text: album.title, detailText: album.artist?.name)
                    item.handler = { [weak self] _, completion in
                        self?.playTracks(album.tracks ?? [])
                        completion()
                    }
                    return item
                }
                let template = CPListTemplate(title: "Albums", sections: [CPListSection(items: items)])
                await MainActor.run { self.interfaceController?.pushTemplate(template, animated: true, completion: nil) }
            } catch {}
        }
    }

    private func pushArtists() {
        Task {
            do {
                let artists = try await MusicyAPI.shared.getArtists().artists
                let items = artists.map { artist -> CPListItem in
                    let item = CPListItem(text: artist.name, detailText: nil)
                    item.handler = { [weak self] _, completion in
                        Task {
                            do {
                                let response = try await MusicyAPI.shared.getArtistTracks(id: artist.id)
                                await MainActor.run { self?.playTracks(response.tracks) }
                            } catch {}
                        }
                        completion()
                    }
                    return item
                }
                let template = CPListTemplate(title: "Artists", sections: [CPListSection(items: items)])
                await MainActor.run { self.interfaceController?.pushTemplate(template, animated: true, completion: nil) }
            } catch {}
        }
    }

    private func pushPlaylists() {
        Task {
            do {
                let playlists = try await MusicyAPI.shared.getPlaylists().playlists
                let items = playlists.map { playlist -> CPListItem in
                    let item = CPListItem(text: playlist.name, detailText: "\(playlist._count?.tracks ?? 0) tracks")
                    item.handler = { [weak self] _, completion in
                        Task {
                            do {
                                let p = try await MusicyAPI.shared.getPlaylist(id: playlist.id)
                                let tracks = p.tracks?.map { $0.track } ?? []
                                await MainActor.run { self?.playTracks(tracks) }
                            } catch {}
                        }
                        completion()
                    }
                    return item
                }
                let template = CPListTemplate(title: "Playlists", sections: [CPListSection(items: items)])
                await MainActor.run { self.interfaceController?.pushTemplate(template, animated: true, completion: nil) }
            } catch {}
        }
    }

    private func pushLiked() {
        Task {
            do {
                let tracks = try await MusicyAPI.shared.getLikedSongs().tracks
                playTracks(tracks)
            } catch {}
        }
    }

    private func playTracks(_ tracks: [Track]) {
        guard let first = tracks.first else { return }
        AudioPlayer.shared.play(track: first, tracks: tracks)
        let nowPlaying = CPNowPlayingTemplate.shared
        interfaceController?.pushTemplate(nowPlaying, animated: true, completion: nil)
    }
}
