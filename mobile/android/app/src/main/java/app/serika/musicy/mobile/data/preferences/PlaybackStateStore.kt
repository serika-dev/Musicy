package app.serika.musicy.mobile.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.model.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

/** The queue as it was when the app was last closed. */
@Serializable
data class SavedQueue(
    val tracks: List<Track> = emptyList(),
    val index: Int = 0,
    val positionMs: Long = 0L,
    val contextId: String? = null
) {
    val isUsable: Boolean get() = tracks.isNotEmpty() && index in tracks.indices
}

private val Context.playbackDataStore: DataStore<Preferences> by preferencesDataStore(name = "playback_state")

/**
 * Remembers the queue across launches so "Resume where I left off" has
 * something to restore. Only the queue is stored — the position is a hint, and
 * playback always comes back paused so the app never starts making noise on
 * its own.
 */
class PlaybackStateStore(context: Context) {

    private val dataStore = context.applicationContext.playbackDataStore
    private val json = ApiClient.json

    suspend fun save(queue: SavedQueue) = withContext(Dispatchers.IO) {
        // A huge queue would bloat the preferences file for no benefit.
        val trimmed = queue.copy(tracks = queue.tracks.take(MAX_TRACKS))
        runCatching {
            dataStore.edit { it[QUEUE_KEY] = json.encodeToString(trimmed) }
        }
    }

    suspend fun load(): SavedQueue? = withContext(Dispatchers.IO) {
        val raw = runCatching { dataStore.data.first()[QUEUE_KEY] }.getOrNull() ?: return@withContext null
        runCatching { json.decodeFromString<SavedQueue>(raw) }.getOrNull()?.takeIf { it.isUsable }
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        runCatching { dataStore.edit { it.remove(QUEUE_KEY) } }
        Unit
    }

    private companion object {
        val QUEUE_KEY = stringPreferencesKey("saved_queue")
        const val MAX_TRACKS = 100
    }
}
