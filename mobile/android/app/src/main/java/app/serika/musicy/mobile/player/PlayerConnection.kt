package app.serika.musicy.mobile.player

import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionToken
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.Track
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Repeat modes, named the way the web player names them. */
enum class RepeatMode { OFF, ALL, ONE }

/**
 * Everything about playback *except* the moving playhead.
 *
 * Position deliberately lives in its own flow ([PlayerConnection.position]):
 * folding it in here meant every screen observing playback recomposed twice a
 * second, and each of those emissions rebuilt the whole queue.
 */
data class PlaybackUiState(
    val currentTrack: Track? = null,
    val queue: List<Track> = emptyList(),
    val currentIndex: Int = 0,
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val durationMs: Long = 0L,
    val shuffle: Boolean = false,
    val repeatMode: RepeatMode = RepeatMode.OFF,
    val volume: Float = 1f,
    val hasNext: Boolean = false,
    val hasPrevious: Boolean = false
)

/** The playhead, emitted on its own so only the scrubber and lyrics redraw. */
data class PlaybackPosition(val positionMs: Long = 0L, val durationMs: Long = 0L) {
    val progress: Float
        get() = if (durationMs > 0) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f
}

/**
 * The app's handle on [MusicyPlaybackService].
 *
 * Screens never touch ExoPlayer directly; they read [state] and call the
 * transport methods here, which keeps the in-app UI, the notification and
 * Android Auto showing exactly the same thing.
 */
@OptIn(UnstableApi::class)
class PlayerConnection(
    private val context: Context,
    private val repo: MusicyRepository
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _state = MutableStateFlow(PlaybackUiState())
    val state: StateFlow<PlaybackUiState> = _state.asStateFlow()

    private val _position = MutableStateFlow(PlaybackPosition())
    val position: StateFlow<PlaybackPosition> = _position.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var controller: MediaController? = null

    /** Cached queue, rebuilt only when the timeline actually changes. */
    private var cachedQueue: List<Track> = emptyList()

    private val listener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) {
            // Reading 200 media items back out of their Bundles is not free, so
            // only redo it when the queue itself changed.
            val queueChanged = events.containsAny(
                Player.EVENT_TIMELINE_CHANGED,
                Player.EVENT_MEDIA_ITEM_TRANSITION,
                Player.EVENT_SHUFFLE_MODE_ENABLED_CHANGED
            )
            refresh(rebuildQueue = queueChanged)
            refreshPosition()
        }
    }

    fun connect() {
        if (controller != null) return
        val token = SessionToken(context, ComponentName(context, MusicyPlaybackService::class.java))
        val futureController = MediaController.Builder(context, token).buildAsync()
        futureController.addListener(
            {
                controller = runCatching { futureController.get() }.getOrNull()
                controller?.addListener(listener)
                _connected.value = controller != null
                refresh(rebuildQueue = true)
                refreshPosition()
            },
            MoreExecutors.directExecutor()
        )

        // The session only pushes events on change, so the scrubber needs its
        // own tick. This updates the position flow alone — nothing else.
        scope.launch {
            while (isActive) {
                if (controller?.isPlaying == true) refreshPosition()
                delay(500)
            }
        }
    }

    fun release() {
        scope.cancel()
        controller?.removeListener(listener)
        controller?.release()
        controller = null
        _connected.value = false
    }

    private fun refreshPosition() {
        val player = controller ?: return
        _position.value = PlaybackPosition(
            positionMs = player.currentPosition.coerceAtLeast(0L),
            durationMs = player.duration.takeIf { it > 0 } ?: 0L
        )
    }

    private fun refresh(rebuildQueue: Boolean) {
        val player = controller ?: return
        if (rebuildQueue) {
            cachedQueue = buildList {
                for (i in 0 until player.mediaItemCount) {
                    MediaItems.toTrack(player.getMediaItemAt(i))?.let { add(it) }
                }
            }
        }
        _state.value = PlaybackUiState(
            currentTrack = MediaItems.toTrack(player.currentMediaItem),
            queue = cachedQueue,
            currentIndex = player.currentMediaItemIndex.coerceAtLeast(0),
            isPlaying = player.isPlaying,
            isBuffering = player.playbackState == Player.STATE_BUFFERING,
            durationMs = player.duration.takeIf { it > 0 } ?: 0L,
            shuffle = player.shuffleModeEnabled,
            repeatMode = when (player.repeatMode) {
                Player.REPEAT_MODE_ONE -> RepeatMode.ONE
                Player.REPEAT_MODE_ALL -> RepeatMode.ALL
                else -> RepeatMode.OFF
            },
            volume = player.volume,
            hasNext = player.hasNextMediaItem(),
            hasPrevious = player.hasPreviousMediaItem()
        )
    }

    // -- transport ----------------------------------------------------------

    /**
     * Replaces the queue and starts playing.
     *
     * @param contextId the browse node these tracks came from, so Android Auto
     *   and the service can reconstruct the same queue later.
     */
    fun play(tracks: List<Track>, startIndex: Int = 0, contextId: String? = null) {
        val player = controller ?: return
        val playable = tracks.filter { !it.filePath.isNullOrBlank() }
        if (playable.isEmpty()) return
        val start = playable.indexOfFirst { it.id == tracks.getOrNull(startIndex)?.id }.coerceAtLeast(0)
        val items: List<MediaItem> = playable.map { MediaItems.fromTrack(it, repo, contextId) }
        player.setMediaItems(items, start, 0L)
        player.prepare()
        player.play()
        claimPlaybackForThisDevice()
    }

    /** Queues a single track after the current one. */
    fun playNext(track: Track) {
        val player = controller ?: return
        val index = (player.currentMediaItemIndex + 1).coerceAtMost(player.mediaItemCount)
        player.addMediaItem(index, MediaItems.fromTrack(track, repo))
        if (player.mediaItemCount == 1) {
            player.prepare()
            player.play()
        }
    }

    fun addToQueue(tracks: List<Track>) {
        val player = controller ?: return
        val items = tracks.filter { !it.filePath.isNullOrBlank() }
            .map { MediaItems.fromTrack(it, repo) }
        if (items.isEmpty()) return
        player.addMediaItems(items)
        if (player.mediaItemCount == items.size) {
            player.prepare()
            player.play()
        }
    }

    fun removeFromQueue(index: Int) {
        val player = controller ?: return
        if (index in 0 until player.mediaItemCount) player.removeMediaItem(index)
    }

    fun skipTo(index: Int) {
        val player = controller ?: return
        if (index in 0 until player.mediaItemCount) {
            player.seekTo(index, 0L)
            player.play()
            refresh(rebuildQueue = false)
            refreshPosition()
        }
    }

    fun togglePlayPause() {
        val player = controller ?: return
        if (player.isPlaying) player.pause() else {
            if (player.playbackState == Player.STATE_IDLE) player.prepare()
            player.play()
            claimPlaybackForThisDevice()
        }
        refresh(rebuildQueue = false)
    }

    fun next() {
        controller?.seekToNextMediaItem()
        refreshPosition()
    }

    /** Restarts the track first, like every other music app's back button. */
    fun previous() {
        val player = controller ?: return
        if (player.currentPosition > 3_000L) player.seekTo(0L) else player.seekToPreviousMediaItem()
        refreshPosition()
    }

    fun seekTo(ms: Long) {
        controller?.seekTo(ms.coerceAtLeast(0L))
        refreshPosition()
    }

    fun setVolume(value: Float) {
        controller?.volume = value.coerceIn(0f, 1f)
    }

    fun setPlaybackSpeed(value: Float) {
        controller?.setPlaybackSpeed(value.coerceIn(0.5f, 2f))
    }

    /** Jumps by the user's configured step, used by the ±N second buttons. */
    fun seekBy(seconds: Int) {
        val player = controller ?: return
        val target = (player.currentPosition + seconds * 1000L).coerceAtLeast(0L)
        val duration = player.duration
        player.seekTo(if (duration > 0) target.coerceAtMost(duration) else target)
        refreshPosition()
    }

    fun toggleShuffle() {
        val player = controller ?: return
        player.shuffleModeEnabled = !player.shuffleModeEnabled
        refresh(rebuildQueue = false)
    }

    fun cycleRepeat() {
        val player = controller ?: return
        player.repeatMode = when (player.repeatMode) {
            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
            else -> Player.REPEAT_MODE_OFF
        }
        refresh(rebuildQueue = false)
    }

    fun stop() {
        controller?.stop()
        controller?.clearMediaItems()
    }

    /** Tells the session to like/unlike, keeping the car UI in step. */
    fun toggleLike(trackId: String) {
        val player = controller ?: return
        val args = Bundle().apply { putString(MusicyPlaybackService.ARG_TRACK_ID, trackId) }
        player.sendCustomCommand(
            SessionCommand(MusicyPlaybackService.COMMAND_TOGGLE_LIKE, Bundle.EMPTY),
            args
        )
    }

    /**
     * Arms the sleep timer. The countdown lives in the service, so it keeps
     * running with the app closed.
     */
    fun setSleepTimer(minutes: Int) = sendSleep {
        putInt(MusicyPlaybackService.ARG_SLEEP_MINUTES, minutes)
    }

    /** Stops once the current song finishes rather than mid-track. */
    fun sleepAtEndOfTrack() = sendSleep {
        putBoolean(MusicyPlaybackService.ARG_SLEEP_END_OF_TRACK, true)
    }

    fun cancelSleepTimer() = sendSleep { putInt(MusicyPlaybackService.ARG_SLEEP_MINUTES, 0) }

    private fun sendSleep(build: Bundle.() -> Unit) {
        val args = Bundle().apply(build)
        controller?.sendCustomCommand(
            SessionCommand(MusicyPlaybackService.COMMAND_SLEEP_TIMER, Bundle.EMPTY),
            args
        )
    }

    fun refreshLibrary() {
        controller?.sendCustomCommand(
            SessionCommand(MusicyPlaybackService.COMMAND_REFRESH_LIBRARY, Bundle.EMPTY),
            Bundle.EMPTY
        )
    }

    /** Starting audio here makes this phone the active Musicy Connect device. */
    private fun claimPlaybackForThisDevice() {
        SyncHolder.client?.takeIf { repo.settings.value.syncEnabled }?.claim()
    }
}
