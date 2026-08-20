package app.serika.musicy.mobile.data.cache

import android.content.Context
import app.serika.musicy.mobile.data.api.ApiClient
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer

/**
 * Disk cache of catalogue JSON so Home, Library and artist/album pages keep
 * working with the radio off. Each key is a file under filesDir/catalogue.
 */
class CatalogueCache(context: Context) {

    private val directory = File(context.applicationContext.filesDir, "catalogue").apply { mkdirs() }
    private val json = ApiClient.json
    private val mutex = Mutex()

    suspend fun <T> read(key: String, serializer: KSerializer<T>): T? = withContext(Dispatchers.IO) {
        mutex.withLock {
            val file = fileFor(key)
            if (!file.exists() || file.length() == 0L) return@withLock null
            runCatching { json.decodeFromString(serializer, file.readText()) }.getOrNull()
        }
    }

    suspend fun <T> write(key: String, value: T, serializer: KSerializer<T>) = withContext(Dispatchers.IO) {
        mutex.withLock {
            runCatching {
                fileFor(key).writeText(json.encodeToString(serializer, value))
            }
        }
        Unit
    }

    suspend fun remove(key: String) = withContext(Dispatchers.IO) {
        mutex.withLock { fileFor(key).delete() }
        Unit
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        mutex.withLock { directory.listFiles()?.forEach { it.delete() } }
        Unit
    }

    fun sizeBytes(): Long = directory.walkTopDown().filter { it.isFile }.sumOf { it.length() }

    private fun fileFor(key: String): File {
        val safe = key.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        return File(directory, "$safe.json")
    }

    companion object {
        const val FEED = "feed"
        const val DAILY_MIXES = "daily-mixes"
        const val GENRES = "genres"
        const val LIKED = "liked"
        const val PLAYLISTS = "playlists"
        const val FOLLOWED = "followed"
        const val RECENT = "recent"
        const val ALBUMS = "albums"
        const val ARTISTS = "artists"
        const val PROFILE = "profile"
        fun artist(id: String) = "artist-$id"
        fun artistTracks(id: String) = "artist-tracks-$id"
        fun artistAlbums(id: String) = "artist-albums-$id"
        fun album(id: String) = "album-$id"
        fun playlist(id: String) = "playlist-$id"
        fun mix(id: String) = "mix-$id"
        fun track(id: String) = "track-$id"
    }
}
