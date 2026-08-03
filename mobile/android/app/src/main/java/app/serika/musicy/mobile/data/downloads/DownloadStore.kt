package app.serika.musicy.mobile.data.downloads

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.model.Track
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import okhttp3.OkHttpClient
import okhttp3.Request

@Serializable
data class DownloadedTrack(
    val track: Track,
    val fileName: String,
    val sizeBytes: Long,
    val downloadedAt: Long
)

@Serializable
internal data class DownloadIndex(val items: List<DownloadedTrack> = emptyList())

private val Context.downloadsDataStore: DataStore<Preferences> by preferencesDataStore(name = "downloads")

/**
 * Offline library, the phone's answer to the web app's Downloads page.
 *
 * Files land in the app's private storage and the index records enough of the
 * track to render and play it with no network at all.
 */
class DownloadStore(context: Context) {

    private val appContext = context.applicationContext
    private val dataStore = appContext.downloadsDataStore
    private val json = ApiClient.json

    private val directory: File
        get() = File(appContext.filesDir, "downloads").apply { if (!exists()) mkdirs() }

    /**
     * trackId -> local file path, kept in memory.
     *
     * [localUri] is called while building every queue item, on the main thread.
     * Hitting the filesystem there made long playlists visibly janky, so the
     * directory is scanned once and then maintained as files come and go.
     */
    private val localFiles = ConcurrentHashMap<String, String>()

    @Volatile
    private var scanned = false

    val downloads: Flow<List<DownloadedTrack>> = dataStore.data.map { prefs ->
        prefs[INDEX_KEY]?.let { raw ->
            runCatching { json.decodeFromString<DownloadIndex>(raw).items }.getOrDefault(emptyList())
        }.orEmpty()
    }

    suspend fun current(): List<DownloadedTrack> = withContext(Dispatchers.IO) { downloads.first() }

    /** Populates the in-memory index. Safe to call repeatedly; scans once. */
    suspend fun warmUp() = withContext(Dispatchers.IO) {
        if (scanned) return@withContext
        directory.listFiles()?.forEach { file ->
            if (file.length() > 0) localFiles[file.nameWithoutExtension] = file.absolutePath
        }
        scanned = true
    }

    fun fileFor(trackId: String): File? = localFiles[trackId]?.let(::File)?.takeIf { it.length() > 0 }

    /** Local `file://` URI when the track is available offline. */
    fun localUri(trackId: String): String? = localFiles[trackId]?.let { "file://$it" }

    fun isDownloaded(trackId: String): Boolean = localFiles.containsKey(trackId)

    suspend fun download(track: Track, client: OkHttpClient, remoteUrl: String): Result<DownloadedTrack> =
        withContext(Dispatchers.IO) {
            runCatching {
                val extension = track.format?.lowercase()?.takeIf { it.isNotBlank() }
                    ?: remoteUrl.substringAfterLast('.', "").substringBefore('?').ifBlank { "mp3" }
                val target = File(directory, "${track.id}.$extension")
                val request = Request.Builder().url(remoteUrl).build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) error("Download failed (${response.code})")
                    val body = response.body ?: error("Empty download body")
                    target.outputStream().use { out -> body.byteStream().copyTo(out) }
                }
                val entry = DownloadedTrack(
                    track = track,
                    fileName = target.name,
                    sizeBytes = target.length(),
                    downloadedAt = System.currentTimeMillis()
                )
                localFiles[track.id] = target.absolutePath
                updateIndex { items -> items.filterNot { it.track.id == track.id } + entry }
                entry
            }
        }

    suspend fun remove(trackId: String) = withContext(Dispatchers.IO) {
        fileFor(trackId)?.delete()
        localFiles.remove(trackId)
        updateIndex { items -> items.filterNot { it.track.id == trackId } }
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        directory.listFiles()?.forEach { it.delete() }
        localFiles.clear()
        updateIndex { emptyList() }
    }

    fun totalBytes(items: List<DownloadedTrack>): Long = items.sumOf { it.sizeBytes }

    private suspend fun updateIndex(transform: (List<DownloadedTrack>) -> List<DownloadedTrack>) {
        dataStore.edit { prefs ->
            val existing = prefs[INDEX_KEY]?.let {
                runCatching { json.decodeFromString<DownloadIndex>(it).items }.getOrDefault(emptyList())
            }.orEmpty()
            prefs[INDEX_KEY] = json.encodeToString(DownloadIndex(transform(existing)))
        }
    }

    private companion object {
        val INDEX_KEY = stringPreferencesKey("download_index")
    }
}
