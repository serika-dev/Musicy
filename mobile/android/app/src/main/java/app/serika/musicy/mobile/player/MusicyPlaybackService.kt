package app.serika.musicy.mobile.player

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import app.serika.musicy.mobile.MainActivity
import app.serika.musicy.mobile.R
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.Track
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.guava.future
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * The one place audio actually plays.
 *
 * The in-app UI, the notification, Bluetooth buttons and Android Auto all
 * attach to this session, so there is a single queue and a single transport
 * state no matter where the user pressed play.
 */
@OptIn(UnstableApi::class)
class MusicyPlaybackService : MediaLibraryService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private lateinit var player: ExoPlayer
    private lateinit var session: MediaLibrarySession
    private lateinit var repo: MusicyRepository
    private lateinit var library: MusicyLibrary

    /** Accumulates listening time so plays are scrobbled with a real duration. */
    private var scrobbleTrackId: String? = null
    private var scrobbleStartedAtMs: Long = 0L
    private var scrobbleAccumulatedMs: Long = 0L

    override fun onCreate() {
        super.onCreate()
        repo = MusicyRepository.get(this)
        library = MusicyLibrary(repo)

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .setUsage(C.USAGE_MEDIA)
                    .build(),
                /* handleAudioFocus = */ true
            )
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()

        player.addListener(PlaybackListener())

        val sessionActivity = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        session = MediaLibrarySession.Builder(this, player, LibraryCallback())
            .setSessionActivity(sessionActivity)
            .setId(SESSION_ID)
            .build()

        // Media3 1.3 has no setSmallIcon on the provider; the status-bar icon
        // is overridden instead by shipping our own drawable named
        // media3_notification_small_icon, which shadows the library's.
        setMediaNotificationProvider(
            DefaultMediaNotificationProvider.Builder(this)
                .setChannelName(R.string.channel_playback_name)
                .build()
        )

        PlaybackBridge.attach(repo, library, serviceScope) { player }

        // Keep the engine in step with the user's preferences.
        serviceScope.launch {
            repo.settings.collect { settings ->
                player.skipSilenceEnabled = settings.skipSilence
                if (player.playbackParameters.speed != settings.playbackSpeed) {
                    player.setPlaybackSpeed(settings.playbackSpeed)
                }
                player.volume = settings.defaultVolume
            }
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession = session

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Swiping the app away while paused should not leave a dead
        // notification behind; while playing, keep going in the background.
        if (!player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        flushScrobble()
        PlaybackBridge.detach()
        session.release()
        player.release()
        serviceScope.cancel()
        super.onDestroy()
    }

    // -- scrobbling ---------------------------------------------------------

    private fun startScrobble(trackId: String?) {
        flushScrobble()
        scrobbleTrackId = trackId
        scrobbleAccumulatedMs = 0L
        scrobbleStartedAtMs = if (player.isPlaying) System.currentTimeMillis() else 0L
    }

    private fun pauseScrobble() {
        if (scrobbleStartedAtMs > 0L) {
            scrobbleAccumulatedMs += System.currentTimeMillis() - scrobbleStartedAtMs
            scrobbleStartedAtMs = 0L
        }
    }

    private fun resumeScrobble() {
        if (scrobbleTrackId != null && scrobbleStartedAtMs == 0L) {
            scrobbleStartedAtMs = System.currentTimeMillis()
        }
    }

    private fun flushScrobble() {
        pauseScrobble()
        val id = scrobbleTrackId
        val seconds = (scrobbleAccumulatedMs / 1000L).toInt()
        scrobbleTrackId = null
        scrobbleAccumulatedMs = 0L
        // Anything under a few seconds is a skip, not a listen.
        if (id != null && seconds >= 5) repo.recordPlay(id, seconds)
    }

    private inner class PlaybackListener : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            startScrobble(mediaItem?.mediaId)
            maybeExtendQueue()
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) resumeScrobble() else pauseScrobble()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_ENDED) flushScrobble()
        }
    }

    /**
     * Keeps the music going past the end of a short queue when the user has
     * autoplay enabled, mirroring the web app's "autoplay recommendations".
     */
    private fun maybeExtendQueue() {
        if (!repo.settings.value.autoplayRecommendations) return
        val remaining = player.mediaItemCount - player.currentMediaItemIndex
        if (remaining > 2 || player.mediaItemCount == 0) return
        serviceScope.launch {
            val existing = buildSet {
                for (i in 0 until player.mediaItemCount) add(player.getMediaItemAt(i).mediaId)
            }
            val extra = withContext(Dispatchers.IO) {
                runCatching { repo.feed().recommendedTracks }.getOrDefault(emptyList())
            }.filterNot { it.id in existing }.take(10)
            if (extra.isEmpty()) return@launch
            player.addMediaItems(extra.map { MediaItems.fromTrack(it, repo) })
        }
    }

    // -- browse tree --------------------------------------------------------

    private inner class LibraryCallback : MediaLibrarySession.Callback {

        override fun onConnect(
            session: MediaSession,
            controller: MediaSession.ControllerInfo
        ): MediaSession.ConnectionResult {
            val available = MediaSession.ConnectionResult.DEFAULT_SESSION_AND_LIBRARY_COMMANDS
                .buildUpon()
                .add(SessionCommand(COMMAND_TOGGLE_LIKE, Bundle.EMPTY))
                .add(SessionCommand(COMMAND_REFRESH_LIBRARY, Bundle.EMPTY))
                .build()
            return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                .setAvailableSessionCommands(available)
                .build()
        }

        override fun onCustomCommand(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
            customCommand: SessionCommand,
            args: Bundle
        ): ListenableFuture<SessionResult> = when (customCommand.customAction) {
            COMMAND_TOGGLE_LIKE -> serviceScope.future {
                val trackId = args.getString(ARG_TRACK_ID) ?: player.currentMediaItem?.mediaId
                if (trackId == null) {
                    SessionResult(SessionResult.RESULT_ERROR_INVALID_STATE)
                } else {
                    withContext(Dispatchers.IO) { repo.toggleLike(trackId) }
                    SessionResult(SessionResult.RESULT_SUCCESS)
                }
            }
            COMMAND_REFRESH_LIBRARY -> {
                library.clearCaches()
                this@MusicyPlaybackService.session.notifyChildrenChanged(MusicyLibrary.ROOT, Int.MAX_VALUE, null)
                Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
            }
            else -> Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_NOT_SUPPORTED))
        }

        override fun onGetLibraryRoot(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val extras = Bundle().apply {
                putBoolean(MediaItems.CONTENT_STYLE_SUPPORTED, true)
                putInt(MediaItems.CONTENT_STYLE_BROWSABLE_HINT, MediaItems.CONTENT_STYLE_GRID)
                putInt(MediaItems.CONTENT_STYLE_PLAYABLE_HINT, MediaItems.CONTENT_STYLE_LIST)
            }
            val root = MediaItem.Builder()
                .setMediaId(MusicyLibrary.ROOT)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle("Musicy")
                        .setIsBrowsable(true)
                        .setIsPlayable(false)
                        .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                        .setExtras(extras)
                        .build()
                )
                .build()
            return Futures.immediateFuture(
                LibraryResult.ofItem(root, LibraryParams.Builder().setExtras(extras).build())
            )
        }

        override fun onGetChildren(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            parentId: String,
            page: Int,
            pageSize: Int,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> = serviceScope.future {
            // A signed-out browse is the car's problem to surface, not an empty
            // list: Auto renders this as a "Sign in" button that opens the app.
            if (!repo.config.value.isConfigured) {
                return@future LibraryResult.ofError(
                    SessionResult.RESULT_ERROR_SESSION_AUTHENTICATION_EXPIRED,
                    signInLibraryParams()
                )
            }

            val children = withContext(Dispatchers.IO) {
                runCatching { library.children(parentId) }
                    .onFailure { Log.w(TAG, "browse failed for $parentId: ${it.message}") }
                    .getOrDefault(emptyList())
            }
            LibraryResult.ofItemList(ImmutableList.copyOf(children), params)
        }

        override fun onGetItem(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            mediaId: String
        ): ListenableFuture<LibraryResult<MediaItem>> = serviceScope.future {
            val track = withContext(Dispatchers.IO) { library.trackFor(mediaId) }
            if (track == null) {
                LibraryResult.ofError(SessionResult.RESULT_ERROR_BAD_VALUE)
            } else {
                LibraryResult.ofItem(MediaItems.fromTrack(track, repo), null)
            }
        }

        override fun onSearch(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            query: String,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<Void>> = serviceScope.future {
            val results = withContext(Dispatchers.IO) {
                runCatching { library.searchResults(query) }.getOrDefault(emptyList())
            }
            searchCache[query] = results
            session.notifySearchResultChanged(browser, query, results.size, params)
            LibraryResult.ofVoid()
        }

        override fun onGetSearchResult(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            query: String,
            page: Int,
            pageSize: Int,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> = serviceScope.future {
            val cached = searchCache[query] ?: withContext(Dispatchers.IO) {
                runCatching { library.searchResults(query) }.getOrDefault(emptyList())
            }
            LibraryResult.ofItemList(ImmutableList.copyOf(cached), params)
        }

        /**
         * Android Auto and voice assistants hand back a bare media id; this
         * turns it into something with a stream URL, expanding a single tap
         * into the album or playlist it came from.
         */
        override fun onSetMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
            startIndex: Int,
            startPositionMs: Long
        ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = serviceScope.future {
            withContext(Dispatchers.IO) { expand(mediaItems, startIndex, startPositionMs) }
        }

        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>
        ): ListenableFuture<MutableList<MediaItem>> = serviceScope.future {
            withContext(Dispatchers.IO) { resolveItems(mediaItems).toMutableList() }
        }

        override fun onPlaybackResumption(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo
        ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = serviceScope.future {
            // Resuming from a car or headset with no session: fall back to the
            // user's liked songs so the play button is never a dead end.
            val tracks = withContext(Dispatchers.IO) {
                runCatching { repo.likedSongs(limit = 50) }.getOrDefault(emptyList())
            }
            MediaSession.MediaItemsWithStartPosition(
                tracks.map { MediaItems.fromTrack(it, repo, MusicyLibrary.NODE_LIKED) },
                0,
                C.TIME_UNSET
            )
        }
    }

    private val searchCache = mutableMapOf<String, List<MediaItem>>()

    /**
     * Extras that turn a browse error into an actionable prompt in the car.
     * Android Auto reads these legacy keys and renders a labelled button that
     * launches the phone app so the user can sign in.
     */
    private fun signInLibraryParams(): LibraryParams {
        val launch = PendingIntent.getActivity(
            this,
            1,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val extras = Bundle().apply {
            putString(ERROR_RESOLUTION_ACTION_LABEL, getString(R.string.auto_sign_in_action))
            putParcelable(ERROR_RESOLUTION_ACTION_INTENT, launch)
        }
        return LibraryParams.Builder().setExtras(extras).build()
    }

    private suspend fun resolveItems(items: List<MediaItem>): List<MediaItem> = items.map { item ->
        if (item.localConfiguration != null) {
            item
        } else {
            val track = library.trackFor(item.mediaId)
            if (track != null) {
                MediaItems.fromTrack(track, repo, MediaItems.parentIdOf(item))
            } else {
                item
            }
        }
    }

    private suspend fun expand(
        items: List<MediaItem>,
        startIndex: Int,
        startPositionMs: Long
    ): MediaSession.MediaItemsWithStartPosition {
        val resolved = resolveItems(items)

        if (resolved.size == 1) {
            val single = resolved.first()
            val parentId = MediaItems.parentIdOf(single)

            // A browse folder was played directly ("play this album").
            if (parentId == null && single.localConfiguration == null) {
                val queue = library.queueFor(single.mediaId)
                if (queue.isNotEmpty()) {
                    return MediaSession.MediaItemsWithStartPosition(
                        queue.map { MediaItems.fromTrack(it, repo, single.mediaId) },
                        0,
                        C.TIME_UNSET
                    )
                }
            }

            // A single song was tapped inside a folder: queue its siblings.
            if (parentId != null) {
                val queue = library.queueFor(parentId)
                val index = queue.indexOfFirst { it.id == single.mediaId }
                if (queue.size > 1 && index >= 0) {
                    return MediaSession.MediaItemsWithStartPosition(
                        queue.map { MediaItems.fromTrack(it, repo, parentId) },
                        index,
                        startPositionMs
                    )
                }
            }
        }

        return MediaSession.MediaItemsWithStartPosition(
            resolved,
            startIndex.coerceIn(0, (resolved.size - 1).coerceAtLeast(0)),
            startPositionMs
        )
    }

    companion object {
        private const val TAG = "MusicyPlayback"
        const val SESSION_ID = "musicy_session"
        const val COMMAND_TOGGLE_LIKE = "app.serika.musicy.TOGGLE_LIKE"
        const val COMMAND_REFRESH_LIBRARY = "app.serika.musicy.REFRESH_LIBRARY"
        const val ARG_TRACK_ID = "trackId"

        // Legacy MediaBrowser keys Android Auto still reads for error actions.
        private const val ERROR_RESOLUTION_ACTION_LABEL = "android.media.extras.ERROR_RESOLUTION_ACTION_LABEL"
        private const val ERROR_RESOLUTION_ACTION_INTENT = "android.media.extras.ERROR_RESOLUTION_ACTION_INTENT"
    }
}

/**
 * Bridges the running service to the multi-device sync bus.
 *
 * Sync has to keep working while the UI is gone — a phone playing in the car
 * should still show up as the active device on the web — so the SSE client is
 * owned by the service rather than by a screen.
 */
@OptIn(UnstableApi::class)
private object PlaybackBridge {
    private var syncClient: app.serika.musicy.mobile.sync.SyncClient? = null

    fun attach(
        repo: MusicyRepository,
        library: MusicyLibrary,
        scope: CoroutineScope,
        player: () -> Player
    ) {
        val client = app.serika.musicy.mobile.sync.SyncClient(repo, scope)
        syncClient = client
        SyncHolder.client = client

        client.onCommand = { command ->
            scope.launch {
                val p = player()
                when (command.action) {
                    "play" -> p.play()
                    "pause" -> p.pause()
                    "toggle" -> if (p.isPlaying) p.pause() else p.play()
                    "next" -> p.seekToNextMediaItem()
                    "previous" -> p.seekToPreviousMediaItem()
                    "seek" -> command.seconds?.let { p.seekTo((it * 1000).toLong()) }
                    "setVolume" -> command.volume?.let { p.volume = it.toFloat().coerceIn(0f, 1f) }
                    "claim" -> {
                        client.claim()
                        p.play()
                    }
                    "playTrack" -> command.trackId?.let { id ->
                        val track: Track? = withContext(Dispatchers.IO) { library.trackFor(id) }
                        if (track != null) {
                            p.setMediaItem(MediaItems.fromTrack(track, repo))
                            p.prepare()
                            p.play()
                        }
                    }
                }
            }
        }

        client.onRemoteClaim = {
            scope.launch { player().pause() }
        }

        client.start()

        // Heartbeat: broadcast our transport state while we hold playback, on
        // the same 2s cadence the web client uses.
        scope.launch {
            while (isActive) {
                val p = player()
                if (client.isThisDeviceActive && p.mediaItemCount > 0) {
                    val queue = buildList {
                        for (i in 0 until p.mediaItemCount) {
                            MediaItems.toTrack(p.getMediaItemAt(i))?.let { add(it) }
                        }
                    }
                    client.publishState(
                        currentTrack = MediaItems.toTrack(p.currentMediaItem),
                        isPlaying = p.isPlaying,
                        positionSeconds = p.currentPosition / 1000.0,
                        durationSeconds = p.duration.takeIf { it > 0 }?.div(1000.0) ?: 0.0,
                        queue = queue,
                        currentIndex = p.currentMediaItemIndex
                    )
                }
                delay(2_000)
            }
        }
    }

    fun detach() {
        syncClient?.stop()
        syncClient = null
        SyncHolder.client = null
    }
}

/** Process-wide handle so the UI can read sync state owned by the service. */
object SyncHolder {
    @Volatile
    var client: app.serika.musicy.mobile.sync.SyncClient? = null
}
