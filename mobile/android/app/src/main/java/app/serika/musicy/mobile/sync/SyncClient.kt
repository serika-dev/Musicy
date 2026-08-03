package app.serika.musicy.mobile.sync

import android.util.Log
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.model.DeviceListEvent
import app.serika.musicy.mobile.data.model.SyncClaimEvent
import app.serika.musicy.mobile.data.model.SyncCommandEvent
import app.serika.musicy.mobile.data.model.SyncCommandPayload
import app.serika.musicy.mobile.data.model.SyncDevice
import app.serika.musicy.mobile.data.model.SyncStateEvent
import app.serika.musicy.mobile.data.model.SyncStatePayload
import app.serika.musicy.mobile.data.model.Track
import kotlin.math.min
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Musicy Connect for Android — the phone joins the same device bus the web app
 * uses, so playback can be handed between a browser tab and this app.
 *
 * Transport is the server's SSE stream (`/api/sync/stream`) read straight off
 * an OkHttp response body; commands go back over `/api/sync/publish`.
 */
class SyncClient(
    private val repo: MusicyRepository,
    private val scope: CoroutineScope
) {
    private val json = ApiClient.json

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private val _devices = MutableStateFlow<List<SyncDevice>>(emptyList())
    val devices: StateFlow<List<SyncDevice>> = _devices.asStateFlow()

    private val _activeDeviceId = MutableStateFlow<String?>(null)
    val activeDeviceId: StateFlow<String?> = _activeDeviceId.asStateFlow()

    /** Last state broadcast by whichever device currently holds playback. */
    private val _remoteState = MutableStateFlow<SyncStatePayload?>(null)
    val remoteState: StateFlow<SyncStatePayload?> = _remoteState.asStateFlow()

    private val _deviceId = MutableStateFlow("")
    val deviceId: StateFlow<String> = _deviceId.asStateFlow()

    /** Invoked for commands addressed to this device. Runs off the main thread. */
    var onCommand: ((SyncCommandPayload) -> Unit)? = null

    /** Invoked when another device claims playback, so we can stop our audio. */
    var onRemoteClaim: ((String) -> Unit)? = null

    private var streamJob: Job? = null
    private var deviceName: String = "Android device"

    val isThisDeviceActive: Boolean
        get() = _activeDeviceId.value != null && _activeDeviceId.value == _deviceId.value

    fun start() {
        if (streamJob?.isActive == true) return
        streamJob = scope.launch(Dispatchers.IO) {
            repo.awaitConfig()
            val id = repo.settingsStore.ensureDeviceId()
            _deviceId.value = id
            deviceName = repo.settings.value.deviceName.ifBlank { "Android device" }

            var attempt = 0
            while (isActive) {
                if (!repo.settings.value.syncEnabled) {
                    _connected.value = false
                    delay(5_000)
                    continue
                }
                try {
                    openStream(id)
                    attempt = 0
                } catch (cancelled: kotlinx.coroutines.CancellationException) {
                    throw cancelled
                } catch (e: Exception) {
                    Log.w(TAG, "sync stream dropped: ${e.message}")
                } finally {
                    _connected.value = false
                }
                ensureActive()
                // Exponential backoff with jitter, capped, mirroring the web client.
                val backoff = min(15_000L, 1_000L * (1L shl min(attempt, 4)))
                attempt++
                delay(backoff + (0..500).random())
            }
        }
        // Seed the picker from the REST endpoint so it is populated before the
        // first `device-list` frame arrives.
        scope.launch(Dispatchers.IO) {
            runCatching { repo.devices() }.getOrNull()?.let { list ->
                _devices.value = list
                list.firstOrNull { it.isActive }?.let { _activeDeviceId.value = it.id }
            }
        }
    }

    fun stop() {
        streamJob?.cancel()
        streamJob = null
        _connected.value = false
    }

    private suspend fun openStream(id: String) = withContext(Dispatchers.IO) {
        val config = repo.config.value
        val base = ApiClient.normalizedBaseUrl(config)
        val url = "$base/api/sync/stream?deviceId=${enc(id)}&name=${enc(deviceName)}"
        val request = Request.Builder()
            .url(url)
            .header("Accept", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .build()

        ApiClient.okHttp(config).newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("sync stream HTTP ${response.code}")
            _connected.value = true
            val source = response.body?.source() ?: error("empty sync stream")

            var event = "message"
            val data = StringBuilder()
            while (isActive && !source.exhausted()) {
                val line = source.readUtf8LineStrict()
                when {
                    line.isEmpty() -> {
                        if (data.isNotEmpty()) dispatch(event, data.toString())
                        event = "message"
                        data.setLength(0)
                    }
                    line.startsWith(":") -> Unit // heartbeat comment
                    line.startsWith("event:") -> event = line.removePrefix("event:").trim()
                    line.startsWith("data:") -> data.append(line.removePrefix("data:").trim())
                }
            }
        }
    }

    private fun dispatch(event: String, payload: String) {
        runCatching {
            when (event) {
                "device-list" -> {
                    val parsed = json.decodeFromString<DeviceListEvent>(payload)
                    _devices.value = parsed.payload.devices
                    parsed.payload.devices.firstOrNull { it.isActive }?.let { _activeDeviceId.value = it.id }
                }
                "state" -> {
                    val parsed = json.decodeFromString<SyncStateEvent>(payload)
                    if (parsed.fromDeviceId != _deviceId.value) {
                        _remoteState.value = parsed.payload
                        parsed.payload.activeDeviceId?.let { _activeDeviceId.value = it }
                    }
                }
                "claim" -> {
                    val parsed = json.decodeFromString<SyncClaimEvent>(payload)
                    val from = parsed.fromDeviceId ?: return@runCatching
                    _activeDeviceId.value = from
                    if (from != _deviceId.value) onRemoteClaim?.invoke(parsed.payload.deviceName)
                }
                "command" -> {
                    val parsed = json.decodeFromString<SyncCommandEvent>(payload)
                    val target = parsed.targetDeviceId
                    val forUs = target == null || target == _deviceId.value
                    // Untargeted commands only apply to whoever holds playback.
                    if (forUs && (target != null || isThisDeviceActive)) {
                        onCommand?.invoke(parsed.payload)
                    }
                }
                "disconnect" -> {
                    val gone = json.decodeFromString<SyncClaimEvent>(payload).fromDeviceId
                    if (gone != null) {
                        _devices.value = _devices.value.filterNot { it.id == gone }
                        if (_activeDeviceId.value == gone) _activeDeviceId.value = null
                    }
                }
            }
        }.onFailure { Log.w(TAG, "bad sync frame ($event): ${it.message}") }
    }

    // -- outbound -----------------------------------------------------------

    /** Announces this device as the one playing audio. */
    fun claim() {
        val id = _deviceId.value.ifBlank { return }
        _activeDeviceId.value = id
        publish(
            buildJsonObject {
                put("type", "claim")
                put("fromDeviceId", id)
                put("payload", buildJsonObject { put("deviceName", deviceName) })
            }
        )
    }

    /** Asks another device to take over playback. */
    fun transferTo(targetDeviceId: String) {
        val id = _deviceId.value.ifBlank { return }
        publish(
            buildJsonObject {
                put("type", "command")
                put("fromDeviceId", id)
                put("targetDeviceId", targetDeviceId)
                put("payload", buildJsonObject { put("action", "claim") })
            }
        )
    }

    /** Sends a transport command to the device currently holding playback. */
    fun sendCommand(action: String, seconds: Double? = null, volume: Double? = null, trackId: String? = null) {
        val id = _deviceId.value.ifBlank { return }
        val target = _activeDeviceId.value
        publish(
            buildJsonObject {
                put("type", "command")
                put("fromDeviceId", id)
                if (target != null && target != id) put("targetDeviceId", target)
                put(
                    "payload",
                    buildJsonObject {
                        put("action", action)
                        seconds?.let { put("seconds", it) }
                        volume?.let { put("volume", it) }
                        trackId?.let { put("trackId", it) }
                    }
                )
            }
        )
    }

    /** Broadcasts what this device is playing so other clients can mirror it. */
    fun publishState(
        currentTrack: Track?,
        isPlaying: Boolean,
        positionSeconds: Double,
        durationSeconds: Double,
        queue: List<Track>,
        currentIndex: Int
    ) {
        val id = _deviceId.value.ifBlank { return }
        if (!repo.settings.value.syncEnabled) return
        val trackJson: JsonElement = currentTrack?.let { json.encodeToJsonElement(it) } ?: JsonObject(emptyMap())
        // Long queues are trimmed: the payload only exists so remote UIs can
        // render "up next", and the server relays it to every device.
        val queueJson = json.encodeToJsonElement(queue.take(50))
        publish(
            buildJsonObject {
                put("type", "state")
                put("fromDeviceId", id)
                put(
                    "payload",
                    buildJsonObject {
                        put("trackId", currentTrack?.id)
                        put("currentTrack", trackJson)
                        put("isPlaying", isPlaying)
                        put("currentTime", positionSeconds)
                        put("duration", durationSeconds)
                        put("queue", queueJson)
                        put("currentIndex", currentIndex)
                        put("activeDeviceId", id)
                    }
                )
            }
        )
    }

    private fun publish(body: JsonObject) {
        scope.launch(Dispatchers.IO) {
            runCatching {
                val config = repo.config.value
                if (!config.isConfigured) return@runCatching
                val request = Request.Builder()
                    .url(ApiClient.normalizedBaseUrl(config) + "/api/sync/publish")
                    .post(json.encodeToString(body).toRequestBody(JSON_MEDIA_TYPE))
                    .build()
                ApiClient.okHttp(config).newCall(request).execute().close()
            }.onFailure { Log.w(TAG, "sync publish failed: ${it.message}") }
        }
    }

    private fun enc(value: String) = java.net.URLEncoder.encode(value, "UTF-8")

    private companion object {
        const val TAG = "MusicySync"
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}
