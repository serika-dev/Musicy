package app.serika.musicy.mobile.player

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.Track
import java.util.concurrent.ConcurrentHashMap

/**
 * The browsable catalogue behind Android Auto (and anything else that speaks
 * MediaBrowser). Node ids are stable strings so a car can deep-link straight
 * back into a playlist after a restart.
 */
class MusicyLibrary(private val repo: MusicyRepository) {

    /**
     * Track lists keyed by the browse node they came from. Tapping one song in
     * the car should queue its whole album/playlist, and the car only hands
     * back the single media id — this is how we recover the rest.
     */
    private val queues = ConcurrentHashMap<String, List<Track>>()

    private fun resolve(path: String?): String? = repo.resolveUrl(path)

    suspend fun rootChildren(): List<MediaItem> = listOf(
        MediaItems.browsable(TAB_HOME, "Home", "Made for you", mediaType = MediaMetadata.MEDIA_TYPE_FOLDER_MIXED),
        MediaItems.browsable(TAB_LIBRARY, "Your Library", "Liked songs and playlists", mediaType = MediaMetadata.MEDIA_TYPE_FOLDER_MIXED),
        MediaItems.browsable(TAB_BROWSE, "Browse", "Albums, artists and genres", mediaType = MediaMetadata.MEDIA_TYPE_FOLDER_MIXED),
        MediaItems.browsable(TAB_MIXES, "Daily Mixes", "Fresh every day", grid = true, mediaType = MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
    )

    suspend fun children(parentId: String): List<MediaItem> = when {
        parentId == ROOT -> rootChildren()

        parentId == TAB_HOME -> buildList {
            add(MediaItems.browsable(NODE_RECENT, "Recently played", null, mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST))
            add(MediaItems.browsable(NODE_LIKED, "Liked Songs", null, mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST))
            add(MediaItems.browsable(TAB_MIXES, "Made for you", null, grid = true))
            add(MediaItems.browsable(NODE_NEW_RELEASES, "New releases", null, grid = true))
        }

        parentId == TAB_LIBRARY -> listOf(
            MediaItems.browsable(NODE_LIKED, "Liked Songs", null, mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST),
            MediaItems.browsable(NODE_RECENT, "Recently played", null, mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST),
            MediaItems.browsable(NODE_PLAYLISTS, "Playlists", null, grid = true),
            MediaItems.browsable(NODE_FOLLOWED_ARTISTS, "Followed artists", null, grid = true)
        )

        parentId == TAB_BROWSE -> listOf(
            MediaItems.browsable(NODE_GENRES, "Genres", null, grid = true),
            MediaItems.browsable(NODE_ALBUMS, "Albums", null, grid = true),
            MediaItems.browsable(NODE_ARTISTS, "Artists", null, grid = true),
            MediaItems.browsable(NODE_NEW_RELEASES, "New releases", null, grid = true)
        )

        parentId == TAB_MIXES -> repo.dailyMixes().map { mix ->
            MediaItems.browsable(
                mediaId = mixId(mix.id),
                title = mix.name,
                subtitle = mix.description ?: "${mix.trackCount} tracks",
                artworkUrl = resolve(mix.coverImageUrl ?: mix.tracks?.firstOrNull()?.artworkUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST
            )
        }

        parentId == NODE_LIKED -> playableList(parentId, repo.likedSongs(limit = 200))

        parentId == NODE_RECENT -> playableList(parentId, repo.recentlyPlayed())

        parentId == NODE_PLAYLISTS -> repo.playlists(limit = 50).map { playlist ->
            MediaItems.browsable(
                mediaId = playlistId(playlist.id),
                title = playlist.name,
                subtitle = "${playlist.trackCount} tracks",
                artworkUrl = resolve(playlist.coverImageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_PLAYLIST
            )
        }

        parentId == NODE_ALBUMS -> repo.albums(limit = 50).albums.map { album ->
            MediaItems.browsable(
                mediaId = albumId(album.id),
                title = album.title,
                subtitle = album.artist?.name,
                artworkUrl = resolve(album.coverImageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_ALBUM
            )
        }

        parentId == NODE_NEW_RELEASES -> runCatching { repo.feed().newReleases }
            .getOrDefault(emptyList())
            .ifEmpty { repo.albums(limit = 30).albums }
            .map { album ->
                MediaItems.browsable(
                    mediaId = albumId(album.id),
                    title = album.title,
                    subtitle = album.artist?.name,
                    artworkUrl = resolve(album.coverImageUrl),
                    mediaType = MediaMetadata.MEDIA_TYPE_ALBUM
                )
            }

        parentId == NODE_ARTISTS -> repo.artists(limit = 50).artists.map { artist ->
            MediaItems.browsable(
                mediaId = artistId(artist.id),
                title = artist.name,
                subtitle = artist.count?.tracks?.let { "$it tracks" },
                artworkUrl = resolve(artist.imageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_ARTIST
            )
        }

        parentId == NODE_FOLLOWED_ARTISTS -> repo.followedArtists(limit = 50).map { artist ->
            MediaItems.browsable(
                mediaId = artistId(artist.id),
                title = artist.name,
                subtitle = artist.count?.tracks?.let { "$it tracks" },
                artworkUrl = resolve(artist.imageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_ARTIST
            )
        }

        parentId == NODE_GENRES -> repo.genres().map { genre ->
            MediaItems.browsable(
                mediaId = genreId(genre.name),
                title = genre.name,
                subtitle = "${genre.count} tracks",
                mediaType = MediaMetadata.MEDIA_TYPE_FOLDER_GENRES
            )
        }

        parentId.startsWith(PREFIX_MIX) -> {
            val mix = repo.dailyMix(parentId.removePrefix(PREFIX_MIX))
            playableList(parentId, mix.tracks.orEmpty())
        }

        parentId.startsWith(PREFIX_ALBUM) -> {
            val album = repo.album(parentId.removePrefix(PREFIX_ALBUM))
            playableList(parentId, album.tracks.orEmpty())
        }

        parentId.startsWith(PREFIX_ARTIST) ->
            playableList(parentId, repo.artistTracks(parentId.removePrefix(PREFIX_ARTIST)))

        parentId.startsWith(PREFIX_PLAYLIST) -> {
            val playlist = repo.playlist(parentId.removePrefix(PREFIX_PLAYLIST))
            playableList(parentId, playlist.trackList())
        }

        parentId.startsWith(PREFIX_GENRE) ->
            playableList(parentId, repo.tracks(limit = 100, genre = parentId.removePrefix(PREFIX_GENRE)).tracks)

        else -> emptyList()
    }

    suspend fun searchResults(query: String): List<MediaItem> {
        val results = repo.search(query, limit = 30)
        val tracks = results.tracks?.items.orEmpty()
        val nodeId = searchId(query)
        val trackItems = playableList(nodeId, tracks)
        val albumItems = results.albums?.items.orEmpty().map { album ->
            MediaItems.browsable(
                mediaId = albumId(album.id),
                title = album.title,
                subtitle = album.artist?.name,
                artworkUrl = resolve(album.coverImageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_ALBUM
            )
        }
        val artistItems = results.artists?.items.orEmpty().map { artist ->
            MediaItems.browsable(
                mediaId = artistId(artist.id),
                title = artist.name,
                artworkUrl = resolve(artist.imageUrl),
                mediaType = MediaMetadata.MEDIA_TYPE_ARTIST
            )
        }
        return trackItems + albumItems + artistItems
    }

    /** Resolves a browse node or media id into a playable queue. */
    suspend fun queueFor(mediaId: String): List<Track> {
        queues[mediaId]?.let { return it }
        return when {
            mediaId.startsWith(PREFIX_MIX) ||
                mediaId.startsWith(PREFIX_ALBUM) ||
                mediaId.startsWith(PREFIX_ARTIST) ||
                mediaId.startsWith(PREFIX_PLAYLIST) ||
                mediaId.startsWith(PREFIX_GENRE) ||
                mediaId == NODE_LIKED ||
                mediaId == NODE_RECENT -> {
                children(mediaId)
                queues[mediaId].orEmpty()
            }
            else -> emptyList()
        }
    }

    /** A single track, used when a car resolves a media id it already knows. */
    suspend fun trackFor(mediaId: String): Track? {
        queues.values.forEach { list -> list.firstOrNull { it.id == mediaId }?.let { return it } }
        return runCatching { repo.track(mediaId) }.getOrNull()
    }

    fun cachedQueue(parentId: String): List<Track> = queues[parentId].orEmpty()

    fun cacheQueue(parentId: String, tracks: List<Track>) {
        if (tracks.isNotEmpty()) queues[parentId] = tracks
    }

    fun clearCaches() = queues.clear()

    private fun playableList(parentId: String, tracks: List<Track>): List<MediaItem> {
        cacheQueue(parentId, tracks)
        return tracks.map { MediaItems.fromTrack(it, repo, parentId) }
    }

    companion object {
        const val ROOT = "musicy_root"

        const val TAB_HOME = "tab_home"
        const val TAB_LIBRARY = "tab_library"
        const val TAB_BROWSE = "tab_browse"
        const val TAB_MIXES = "tab_mixes"

        const val NODE_LIKED = "node_liked"
        const val NODE_RECENT = "node_recent"
        const val NODE_PLAYLISTS = "node_playlists"
        const val NODE_ALBUMS = "node_albums"
        const val NODE_ARTISTS = "node_artists"
        const val NODE_GENRES = "node_genres"
        const val NODE_NEW_RELEASES = "node_new_releases"
        const val NODE_FOLLOWED_ARTISTS = "node_followed_artists"

        const val PREFIX_MIX = "mix:"
        const val PREFIX_ALBUM = "album:"
        const val PREFIX_ARTIST = "artist:"
        const val PREFIX_PLAYLIST = "playlist:"
        const val PREFIX_GENRE = "genre:"
        const val PREFIX_SEARCH = "search:"

        fun mixId(id: String) = PREFIX_MIX + id
        fun albumId(id: String) = PREFIX_ALBUM + id
        fun artistId(id: String) = PREFIX_ARTIST + id
        fun playlistId(id: String) = PREFIX_PLAYLIST + id
        fun genreId(name: String) = PREFIX_GENRE + name
        fun searchId(query: String) = PREFIX_SEARCH + query
    }
}
