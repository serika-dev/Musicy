package app.serika.musicy.mobile.player

import android.net.Uri
import android.os.Bundle
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.Album
import app.serika.musicy.mobile.data.model.Artist
import app.serika.musicy.mobile.data.model.Track

/**
 * Translation layer between Musicy's API models and Media3 [MediaItem]s.
 *
 * Everything the UI needs to render "now playing" travels inside the media
 * item, so the app, the notification and Android Auto all read from the same
 * source instead of keeping parallel copies of the queue.
 */
object MediaItems {

    const val EXTRA_TRACK_ID = "musicy.trackId"
    const val EXTRA_ARTIST_ID = "musicy.artistId"
    const val EXTRA_ARTIST_NAME = "musicy.artistName"
    const val EXTRA_ALBUM_ID = "musicy.albumId"
    const val EXTRA_ALBUM_TITLE = "musicy.albumTitle"
    const val EXTRA_COVER_URL = "musicy.coverUrl"
    const val EXTRA_FILE_PATH = "musicy.filePath"
    const val EXTRA_GENRE = "musicy.genre"
    const val EXTRA_DURATION_SEC = "musicy.durationSec"
    const val EXTRA_PARENT_ID = "musicy.parentId"

    /**
     * Builds the playable item for a track. The audio URI comes from the
     * repository so a downloaded copy wins over the network.
     *
     * @param parentId browse node the track was opened from, so tapping one
     *   song in Android Auto can queue the whole list it came from.
     */
    fun fromTrack(track: Track, repo: MusicyRepository, parentId: String? = null): MediaItem {
        val artwork = repo.resolveUrl(track.artworkUrl)
        val audioUri = repo.playbackUrl(track)
        val extras = Bundle().apply {
            putString(EXTRA_TRACK_ID, track.id)
            track.artist?.id?.let { putString(EXTRA_ARTIST_ID, it) }
            putString(EXTRA_ARTIST_NAME, track.artistLine)
            track.album?.id?.let { putString(EXTRA_ALBUM_ID, it) }
            track.album?.title?.let { putString(EXTRA_ALBUM_TITLE, it) }
            track.artworkUrl?.let { putString(EXTRA_COVER_URL, it) }
            track.filePath?.let { putString(EXTRA_FILE_PATH, it) }
            track.genre?.let { putString(EXTRA_GENRE, it) }
            track.duration?.let { putInt(EXTRA_DURATION_SEC, it) }
            parentId?.let { putString(EXTRA_PARENT_ID, it) }
        }

        val metadata = MediaMetadata.Builder()
            .setTitle(track.title)
            .setDisplayTitle(track.title)
            .setArtist(track.artistLine)
            .setAlbumTitle(track.album?.title)
            .setAlbumArtist(track.artist?.name)
            .setGenre(track.genre)
            .setSubtitle(track.artistLine)
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
            .apply {
                artwork?.let { setArtworkUri(Uri.parse(it)) }
                track.trackNumber?.let { setTrackNumber(it) }
            }
            .setExtras(extras)
            .build()

        val builder = MediaItem.Builder()
            .setMediaId(track.id)
            .setMediaMetadata(metadata)
            .setRequestMetadata(
                MediaItem.RequestMetadata.Builder()
                    .setMediaUri(audioUri?.let(Uri::parse))
                    .build()
            )

        audioUri?.let { builder.setUri(it) }
        return builder.build()
    }

    /** Reverses [fromTrack] so the UI can render a full track from the session. */
    fun toTrack(item: MediaItem?): Track? {
        if (item == null) return null
        val metadata = item.mediaMetadata
        val extras = metadata.extras
        val id = extras?.getString(EXTRA_TRACK_ID) ?: item.mediaId.takeIf { it.isNotBlank() } ?: return null
        val artistId = extras?.getString(EXTRA_ARTIST_ID)
        val artistName = extras?.getString(EXTRA_ARTIST_NAME) ?: metadata.artist?.toString()
        val albumId = extras?.getString(EXTRA_ALBUM_ID)
        val albumTitle = extras?.getString(EXTRA_ALBUM_TITLE) ?: metadata.albumTitle?.toString()
        val duration = extras?.getInt(EXTRA_DURATION_SEC, 0)?.takeIf { it > 0 }

        return Track(
            id = id,
            title = metadata.title?.toString() ?: "Unknown",
            duration = duration,
            coverImageUrl = extras?.getString(EXTRA_COVER_URL) ?: metadata.artworkUri?.toString(),
            filePath = extras?.getString(EXTRA_FILE_PATH) ?: item.requestMetadata.mediaUri?.toString(),
            genre = extras?.getString(EXTRA_GENRE) ?: metadata.genre?.toString(),
            artist = artistName?.let { Artist(id = artistId ?: "", name = it) },
            album = albumTitle?.let { Album(id = albumId ?: "", title = it, coverImageUrl = extras?.getString(EXTRA_COVER_URL)) }
        )
    }

    /** The browse node a queue item came from, used to expand single taps. */
    fun parentIdOf(item: MediaItem): String? = item.mediaMetadata.extras?.getString(EXTRA_PARENT_ID)

    fun browsable(
        mediaId: String,
        title: String,
        subtitle: String? = null,
        artworkUrl: String? = null,
        mediaType: Int = MediaMetadata.MEDIA_TYPE_FOLDER_MIXED,
        grid: Boolean = false
    ): MediaItem {
        val extras = Bundle().apply {
            // Android Auto reads these to decide between a list and a grid.
            putInt(CONTENT_STYLE_BROWSABLE_HINT, if (grid) CONTENT_STYLE_GRID else CONTENT_STYLE_LIST)
            putInt(CONTENT_STYLE_PLAYABLE_HINT, CONTENT_STYLE_LIST)
        }
        val metadata = MediaMetadata.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIsBrowsable(true)
            .setIsPlayable(false)
            .setMediaType(mediaType)
            .setExtras(extras)
            .apply { artworkUrl?.let { setArtworkUri(Uri.parse(it)) } }
            .build()
        return MediaItem.Builder().setMediaId(mediaId).setMediaMetadata(metadata).build()
    }

    // Android Auto content-style constants. Declared here as literals so the
    // app does not depend on the legacy media-compat constant classes.
    const val CONTENT_STYLE_BROWSABLE_HINT = "android.media.browse.CONTENT_STYLE_BROWSABLE_HINT"
    const val CONTENT_STYLE_PLAYABLE_HINT = "android.media.browse.CONTENT_STYLE_PLAYABLE_HINT"
    const val CONTENT_STYLE_SUPPORTED = "android.media.browse.CONTENT_STYLE_SUPPORTED"
    const val CONTENT_STYLE_LIST = 1
    const val CONTENT_STYLE_GRID = 2
}
