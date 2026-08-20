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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
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
    val downloadedAt: Long,
    val quality: String? = null
)

@Serializable
internal data class DownloadIndex(val items: List<DownloadedTrack> = emptyList())

private val Context.downloadsDataStore: DataStore<Preferences> by preferencesDataStore(name = "downloads")

/**
 * Offline library. Files live in app-private storage. The index is written
 * three ways on purpose — a JSON file next to the audio, a per-track sidecar,
 * and DataStore — so a wiped preference store (the usual "my downloads
 * vanished" report) can be rebuilt from disk on the next launch.
 */
class DownloadStore(context: Context) {

    private val appContext = context.applicationContext
    private val dataStore = appContext.downloadsDataStore
    private val json = ApiClient.json

    private val directory: File
        get() = File(appContext.filesDir, "downloads").apply { if (!exists()) mkdirs() }

    private val indexFile: File
        get() = File(appContext.filesDir, "downloads_index.json")

    private val localFiles = ConcurrentHashMap<String, String>()

    private val _items = MutableStateFlow<List<DownloadedTrack>>(emptyList())
    val downloads: StateFlow<List<DownloadedTrack>> = _items.asStateFlow()

    @Volatile
    private var scanned = false

    suspend fun current(): List<DownloadedTrack> = withContext(Dispatchers.IO) {
        if (!scanned) warmUp()
        _items.value
    }

    /** Rebuilds the in-memory index from disk. Safe to call repeatedly. */
    suspend fun warmUp() = withContext(Dispatchers.IO) {
        directory.mkdirs()
        val audioFiles = directory.listFiles().orEmpty()
            .filter { it.isFile && it.length() > 0L && !it.name.endsWith(".json", ignoreCase = true) }

        val fromFile = readFileIndex()
        val fromStore = readDataStoreIndex()
        val merged = LinkedHashMap<String, DownloadedTrack>()
        fromStore.forEach { merged[it.track.id] = it }
        fromFile.forEach { merged[it.track.id] = it }

        localFiles.clear()
        audioFiles.forEach { file ->
            val id = file.nameWithoutExtension
            val sidecar = readSidecar(id)
            val known = sidecar ?: merged[id]
            val entry = (known ?: DownloadedTrack(
                track = Track(id = id, title = "Offline track", format = file.extension.uppercase().ifBlank { null }),
                fileName = file.name,
                sizeBytes = file.length(),
                downloadedAt = file.lastModified()
            )).copy(fileName = file.name, sizeBytes = file.length())
            merged[id] = entry
            localFiles[id] = file.absolutePath
            if (sidecar == null) writeSidecar(entry)
        }

        val kept = merged.values
            .filter { localFiles.containsKey(it.track.id) }
            .sortedBy { it.downloadedAt }
        _items.value = kept
        persistIndex(kept)
        persistIndexToStore(kept)
        scanned = true
    }

    fun fileFor(trackId: String): File? = localFiles[trackId]?.let(::File)?.takeIf { it.length() > 0 }

    fun localUri(trackId: String): String? = localFiles[trackId]?.let { "file://$it" }

    fun isDownloaded(trackId: String): Boolean = localFiles.containsKey(trackId)

    suspend fun download(
        track: Track,
        client: OkHttpClient,
        remoteUrl: String,
        quality: String? = null
    ): Result<DownloadedTrack> =
        withContext(Dispatchers.IO) {
            runCatching {
                val extension = track.format?.lowercase()?.takeIf { it.isNotBlank() }
                    ?: run {
                        val path = remoteUrl.substringBefore('?').substringAfterLast('/')
                        path.substringAfterLast('.', "").ifBlank { "mp3" }
                    }
                val target = File(directory, "${track.id}.$extension")
                val tmp = File(directory, "${track.id}.$extension.part")
                val request = Request.Builder().url(remoteUrl).build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) error("Download failed (${response.code})")
                    val body = response.body ?: error("Empty download body")
                    tmp.outputStream().use { out -> body.byteStream().copyTo(out) }
                }
                if (tmp.length() <= 0L) {
                    tmp.delete()
                    error("Empty download")
                }
                if (target.exists()) target.delete()
                if (!tmp.renameTo(target)) {
                    tmp.copyTo(target, overwrite = true)
                    tmp.delete()
                }
                val entry = DownloadedTrack(
                    track = track,
                    fileName = target.name,
                    sizeBytes = target.length(),
                    downloadedAt = System.currentTimeMillis(),
                    quality = quality
                )
                localFiles[track.id] = target.absolutePath
                writeSidecar(entry)
                updateItems { items -> items.filterNot { it.track.id == track.id } + entry }
                entry
            }
        }

    suspend fun remove(trackId: String) = withContext(Dispatchers.IO) {
        fileFor(trackId)?.delete()
        File(directory, "$trackId.json").delete()
        localFiles.remove(trackId)
        updateItems { items -> items.filterNot { it.track.id == trackId } }
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        directory.listFiles()?.forEach { it.delete() }
        indexFile.delete()
        localFiles.clear()
        updateItems { emptyList() }
    }

    fun totalBytes(items: List<DownloadedTrack> = _items.value): Long = items.sumOf { it.sizeBytes }

    private suspend fun updateItems(transform: (List<DownloadedTrack>) -> List<DownloadedTrack>) {
        val next = transform(_items.value)
        _items.value = next
        persistIndex(next)
        persistIndexToStore(next)
    }

    private fun persistIndex(items: List<DownloadedTrack>) {
        val encoded = json.encodeToString(DownloadIndex(items))
        runCatching { indexFile.writeText(encoded) }
        items.forEach { writeSidecar(it) }
    }

    private suspend fun persistIndexToStore(items: List<DownloadedTrack>) {
        runCatching {
            dataStore.edit { prefs ->
                prefs[INDEX_KEY] = json.encodeToString(DownloadIndex(items))
            }
        }
    }

    private suspend fun readDataStoreIndex(): List<DownloadedTrack> {
        val raw = runCatching { dataStore.data.first()[INDEX_KEY] }.getOrNull() ?: return emptyList()
        return runCatching { json.decodeFromString<DownloadIndex>(raw).items }.getOrDefault(emptyList())
    }

    private fun readFileIndex(): List<DownloadedTrack> {
        if (!indexFile.exists()) return emptyList()
        return runCatching {
            json.decodeFromString<DownloadIndex>(indexFile.readText()).items
        }.getOrDefault(emptyList())
    }

    private fun readSidecar(trackId: String): DownloadedTrack? {
        val file = File(directory, "$trackId.json")
        if (!file.exists()) return null
        return runCatching { json.decodeFromString<DownloadedTrack>(file.readText()) }.getOrNull()
    }

    private fun writeSidecar(entry: DownloadedTrack) {
        runCatching {
            File(directory, "${entry.track.id}.json").writeText(json.encodeToString(entry))
        }
    }

    private companion object {
        val INDEX_KEY = stringPreferencesKey("download_index")
    }
}
