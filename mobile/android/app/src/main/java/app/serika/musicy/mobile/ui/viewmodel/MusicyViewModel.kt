package app.serika.musicy.mobile.ui.viewmodel

import android.app.Application
import android.content.Intent
import android.media.audiofx.AudioEffect
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.downloads.DownloadNotifier
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.data.preferences.SavedQueue
import app.serika.musicy.mobile.player.AudioEngineState
import app.serika.musicy.mobile.player.MusicyLibrary
import app.serika.musicy.mobile.player.PlayerConnection
import app.serika.musicy.mobile.player.SyncHolder
import app.serika.musicy.mobile.widget.WidgetActions
import app.serika.musicy.mobile.widget.WidgetSnapshotStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Generic async wrapper so screens can render loading/error without ceremony. */
sealed interface Async<out T> {
    data object Loading : Async<Nothing>
    data class Success<T>(val value: T) : Async<T>
    data class Failure(val message: String) : Async<Nothing>

    @Suppress("UNCHECKED_CAST")
    val valueOrNull: T?
        get() = (this as? Success<T>)?.value
}

data class HomeState(
    val feed: FeedResponse? = null,
    val dailyMixes: List<DailyMix> = emptyList(),
    val genres: List<Genre> = emptyList(),
    val albums: List<Album> = emptyList(),
    val artists: List<Artist> = emptyList(),
    val playlists: List<Playlist> = emptyList()
)

data class LibraryState(
    val likedSongs: List<Track> = emptyList(),
    val playlists: List<Playlist> = emptyList(),
    val followedArtists: List<Artist> = emptyList(),
    val recentlyPlayed: List<Track> = emptyList(),
    val albums: List<Album> = emptyList()
)

/**
 * Screen-facing state for the whole app. Detail screens load their own data
 * through [repo]; this holds the shared surfaces (home, library, search) plus
 * the handles to playback and multi-device sync.
 */
class MusicyViewModel(app: Application) : AndroidViewModel(app) {

    val repo = MusicyRepository.get(app)
    val player = PlayerConnection(app, repo)

    val config: StateFlow<ServerConfig> = repo.config
    val likedTrackIds: StateFlow<Set<String>> = repo.likedTrackIds
    val settings = repo.settings
    val network = repo.network

    /** Reactive set of track ids available offline, so any list/menu stays in sync. */
    val downloadedIds: StateFlow<Set<String>> = repo.downloads
        .map { list -> list.map { it.track.id }.toSet() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    /** Track ids with a download currently in flight, for spinners/disabled state. */
    private val _downloadingIds = MutableStateFlow<Set<String>>(emptySet())
    val downloadingIds: StateFlow<Set<String>> = _downloadingIds.asStateFlow()

    private val _continueQueue = MutableStateFlow<SavedQueue?>(null)
    val continueQueue: StateFlow<SavedQueue?> = _continueQueue.asStateFlow()

    private val _selecting = MutableStateFlow(false)
    val selecting: StateFlow<Boolean> = _selecting.asStateFlow()
    private val _selectedIds = MutableStateFlow<Set<String>>(emptySet())
    val selectedIds: StateFlow<Set<String>> = _selectedIds.asStateFlow()
    private var selectPool: List<Track> = emptyList()

    private val _home = MutableStateFlow<Async<HomeState>>(Async.Loading)
    val home: StateFlow<Async<HomeState>> = _home.asStateFlow()

    private val _library = MutableStateFlow<Async<LibraryState>>(Async.Loading)
    val library: StateFlow<Async<LibraryState>> = _library.asStateFlow()

    // Pull-to-refresh spinners. Kept apart from the Async state so a refresh
    // reloads in place — the current content stays on screen instead of being
    // replaced by a skeleton the moment you pull.
    private val _homeRefreshing = MutableStateFlow(false)
    val homeRefreshing: StateFlow<Boolean> = _homeRefreshing.asStateFlow()

    private val _libraryRefreshing = MutableStateFlow(false)
    val libraryRefreshing: StateFlow<Boolean> = _libraryRefreshing.asStateFlow()

    private val _search = MutableStateFlow<Async<SearchResponse>?>(null)
    val search: StateFlow<Async<SearchResponse>?> = _search.asStateFlow()

    private val _profile = MutableStateFlow<User?>(null)
    val profile: StateFlow<User?> = _profile.asStateFlow()

    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    // Live view of the Musicy Connect bus. The SSE client belongs to the
    // playback service (so sync survives the UI being closed), so the view
    // model mirrors it once the service comes up.
    private val _syncDevices = MutableStateFlow<List<SyncDevice>>(emptyList())
    val syncDevices: StateFlow<List<SyncDevice>> = _syncDevices.asStateFlow()

    private val _syncActiveDeviceId = MutableStateFlow<String?>(null)
    val syncActiveDeviceId: StateFlow<String?> = _syncActiveDeviceId.asStateFlow()

    private val _syncConnected = MutableStateFlow(false)
    val syncConnected: StateFlow<Boolean> = _syncConnected.asStateFlow()

    private val _thisDeviceId = MutableStateFlow("")
    val thisDeviceId: StateFlow<String> = _thisDeviceId.asStateFlow()

    /** Recent searches, so the search tab is useful before you type. */
    val recentSearches: StateFlow<List<String>> = repo.searchHistoryStore.recent
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private var searchJob: Job? = null
    private var syncMirrorJob: Job? = null

    init {
        player.connect()
        mirrorSyncClient()
        // Download index is warmed synchronously when MusicyRepository is
        // constructed, so playbackUrl() already prefers local files here.
        viewModelScope.launch { repo.pullAccountSettings() }
        viewModelScope.launch { repo.ensureLikedIdsLoaded() }
        viewModelScope.launch {
            val saved = repo.playbackStateStore.load()
            _continueQueue.value = saved
            saved?.takeIf { it.isUsable }?.let {
                WidgetSnapshotStore.updateContinue(
                    getApplication(),
                    it.tracks.getOrNull(it.index) ?: it.tracks.first(),
                    it.tracks.size
                )
            }
        }
        viewModelScope.launch {
            combine(_downloadingIds, repo.downloadStore.progress) { ids, prog ->
                ids.size to prog.values.maxOrNull()
            }.collect { (n, p) ->
                DownloadNotifier.update(getApplication(), n, p)
            }
        }
        loadHome()
        loadLibrary()
        refreshProfile()
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }

    /**
     * Waits for the service's sync client, then mirrors its flows into ours.
     * The wait loop exits as soon as the client appears — it used to poll for
     * the lifetime of the view model.
     */
    private fun mirrorSyncClient() {
        viewModelScope.launch {
            var client = SyncHolder.client
            while (client == null) {
                delay(500)
                client = SyncHolder.client
            }
            val bound = client
            syncMirrorJob?.cancel()
            syncMirrorJob = launch {
                launch { bound.devices.collect { _syncDevices.value = it } }
                launch { bound.activeDeviceId.collect { _syncActiveDeviceId.value = it } }
                launch { bound.connected.collect { _syncConnected.value = it } }
                launch { bound.deviceId.collect { _thisDeviceId.value = it } }
            }
        }
    }

    // -- loading ------------------------------------------------------------

    /**
     * Fetches the whole home surface in one fan-out. Fired together rather than
     * one after another: six serial round-trips made the home screen feel
     * broken on a slow connection.
     */
    private suspend fun fetchHome(): HomeState = withContext(Dispatchers.IO) {
        coroutineScope {
            val feed = async { runCatching { repo.feed() }.getOrNull() }
            val mixes = async { runCatching { repo.dailyMixes() }.getOrDefault(emptyList()) }
            val genres = async { runCatching { repo.genres() }.getOrDefault(emptyList()) }
            val albums = async { runCatching { repo.albums(limit = 20).albums }.getOrDefault(emptyList()) }
            val artists = async { runCatching { repo.artists(limit = 20).artists }.getOrDefault(emptyList()) }
            val playlists = async { runCatching { repo.playlists(limit = 20) }.getOrDefault(emptyList()) }
            HomeState(
                feed = feed.await(),
                dailyMixes = mixes.await(),
                genres = genres.await(),
                albums = albums.await(),
                artists = artists.await(),
                playlists = playlists.await()
            )
        }
    }

    private suspend fun fetchLibrary(): LibraryState = withContext(Dispatchers.IO) {
        coroutineScope {
            val liked = async { runCatching { repo.likedSongs() }.getOrDefault(emptyList()) }
            val playlists = async { runCatching { repo.playlists(limit = 50) }.getOrDefault(emptyList()) }
            val followed = async { repo.followedArtists() }
            val recent = async { repo.recentlyPlayed() }
            val albums = async { runCatching { repo.albums(limit = 30).albums }.getOrDefault(emptyList()) }
            val state = LibraryState(
                likedSongs = liked.await(),
                playlists = playlists.await(),
                followedArtists = followed.await(),
                recentlyPlayed = recent.await(),
                albums = albums.await()
            )
            WidgetSnapshotStore.updateLikedCount(getApplication(), state.likedSongs.size)
            state
        }
    }

    fun loadHome(force: Boolean = false) {
        if (!force && _home.value is Async.Success) return
        viewModelScope.launch {
            _home.value = Async.Loading
            _home.value = runCatching { fetchHome() }.fold(
                onSuccess = { Async.Success(it) },
                onFailure = { Async.Failure(it.friendlyMessage()) }
            )
        }
    }

    fun loadLibrary(force: Boolean = false) {
        if (!force && _library.value is Async.Success) return
        viewModelScope.launch {
            _library.value = Async.Loading
            _library.value = runCatching { fetchLibrary() }.fold(
                onSuccess = { Async.Success(it) },
                onFailure = { Async.Failure(it.friendlyMessage()) }
            )
        }
    }

    /** Pull-to-refresh: reload home without tearing down what is on screen. */
    fun refreshHome() {
        if (_homeRefreshing.value) return
        viewModelScope.launch {
            _homeRefreshing.value = true
            // Keep the old value on failure; a pull that briefly drops signal
            // shouldn't wipe the page.
            runCatching { fetchHome() }.onSuccess { _home.value = Async.Success(it) }
            _homeRefreshing.value = false
        }
    }

    fun refreshLibrary() {
        if (_libraryRefreshing.value) return
        viewModelScope.launch {
            _libraryRefreshing.value = true
            runCatching { fetchLibrary() }.onSuccess { _library.value = Async.Success(it) }
            _libraryRefreshing.value = false
        }
    }

    fun refreshProfile() {
        viewModelScope.launch {
            _profile.value = withContext(Dispatchers.IO) { runCatching { repo.profile() }.getOrNull() }
        }
    }

    /** Debounced so typing doesn't fire a request per keystroke. */
    fun search(query: String) {
        searchJob?.cancel()
        if (query.isBlank()) {
            _search.value = null
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _search.value = Async.Loading
            _search.value = runCatching { withContext(Dispatchers.IO) { repo.search(query) } }
                .fold(
                    onSuccess = { Async.Success(it) },
                    onFailure = { Async.Failure(it.friendlyMessage()) }
                )
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _search.value = null
    }

    /** Called when a result is actually opened — that is what "recent" means. */
    fun rememberSearch(query: String) {
        viewModelScope.launch { repo.searchHistoryStore.add(query) }
    }

    fun forgetSearch(query: String) {
        viewModelScope.launch { repo.searchHistoryStore.remove(query) }
    }

    fun clearSearchHistory() {
        viewModelScope.launch { repo.searchHistoryStore.clear() }
        showToast("Recent searches cleared")
    }

    /** Pull-to-refresh equivalent for whichever tab the user is looking at. */
    fun refreshAll() {
        loadHome(force = true)
        loadLibrary(force = true)
        refreshProfile()
        player.refreshLibrary()
    }

    // -- actions ------------------------------------------------------------

    fun play(tracks: List<Track>, startIndex: Int = 0, contextId: String? = null) {
        if (tracks.isEmpty()) {
            showToast("Nothing playable here yet")
            return
        }
        val queue = if (repo.shouldPlayLocalOnly()) {
            val local = tracks.filter { repo.isDownloaded(it.id) }
            if (local.isEmpty()) {
                showToast("Download these tracks to play them offline")
                return
            }
            local
        } else tracks
        val startId = tracks.getOrNull(startIndex)?.id
        val index = startId?.let { id -> queue.indexOfFirst { it.id == id }.takeIf { it >= 0 } } ?: 0
        player.play(queue, index, contextId)
    }

    fun playAlbum(album: Album, startIndex: Int = 0) =
        play(album.tracks.orEmpty(), startIndex, MusicyLibrary.albumId(album.id))

    fun playPlaylist(playlist: Playlist, startIndex: Int = 0) =
        play(playlist.trackList(), startIndex, MusicyLibrary.playlistId(playlist.id))

    fun playMix(mix: DailyMix, startIndex: Int = 0) {
        WidgetSnapshotStore.saveLastMix(getApplication(), mix.id, mix.name)
        play(mix.tracks.orEmpty(), startIndex, MusicyLibrary.mixId(mix.id))
    }

    fun shuffle(tracks: List<Track>, contextId: String? = null) {
        val source = if (repo.shouldPlayLocalOnly()) tracks.filter { repo.isDownloaded(it.id) } else tracks
        if (source.isEmpty()) {
            showToast(if (repo.shouldPlayLocalOnly()) "Download these tracks to play them offline" else "Nothing playable here yet")
            return
        }
        player.play(source.shuffled(), 0, contextId)
    }

    fun toggleLike(track: Track) {
        viewModelScope.launch {
            val nowLiked = withContext(Dispatchers.IO) { repo.toggleLike(track.id) }
            showToast(if (nowLiked) "Added to Liked Songs" else "Removed from Liked Songs")
            // Keep the Library tab honest without a full reload.
            (_library.value as? Async.Success)?.let { current ->
                val songs = if (nowLiked) {
                    listOf(track) + current.value.likedSongs.filterNot { it.id == track.id }
                } else {
                    current.value.likedSongs.filterNot { it.id == track.id }
                }
                _library.value = Async.Success(current.value.copy(likedSongs = songs))
            }
        }
    }

    /**
     * Save a single track for offline playback. No-op if it is already saved or
     * a download is already in flight for it. Emits a toast on completion.
     */
    fun downloadTrack(track: Track) {
        val quality = repo.effectiveQuality()
        val existing = repo.downloadStore.qualityOf(track.id)
        if (track.id in downloadedIds.value && existing == quality) return
        if (track.id in _downloadingIds.value) return
        _downloadingIds.value = _downloadingIds.value + track.id
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                repo.download(track, replace = existing != null && existing != quality)
            }
            _downloadingIds.value = _downloadingIds.value - track.id
            showToast(
                result.fold(
                    onSuccess = {
                        if (existing != null && existing != quality) "Updated download to $quality"
                        else "Saved for offline"
                    },
                    onFailure = { it.message?.takeIf { msg -> msg.isNotBlank() } ?: "Download failed" }
                )
            )
        }
    }

    /** Remove a downloaded track from offline storage. */
    fun removeDownload(track: Track) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { repo.removeDownload(track.id) }
            showToast("Removed download")
        }
    }

    /** Convenience toggle for menus/rows. */
    fun toggleDownload(track: Track) {
        val quality = repo.effectiveQuality()
        val existing = repo.downloadStore.qualityOf(track.id)
        if (track.id in downloadedIds.value && existing == quality) removeDownload(track)
        else downloadTrack(track)
    }

    fun resumeContinueListening() {
        val saved = _continueQueue.value ?: return
        play(saved.tracks, saved.index, saved.contextId)
        if (saved.positionMs > 0) player.seekTo(saved.positionMs)
    }

    fun enterSelectMode(firstId: String? = null, pool: List<Track> = emptyList()) {
        if (pool.isNotEmpty()) selectPool = pool
        _selecting.value = true
        _selectedIds.value = firstId?.let { setOf(it) } ?: emptySet()
    }

    fun exitSelectMode() {
        _selecting.value = false
        _selectedIds.value = emptySet()
        selectPool = emptyList()
    }

    fun toggleSelected(id: String, pool: List<Track> = emptyList()) {
        if (pool.isNotEmpty()) selectPool = pool
        if (!_selecting.value) enterSelectMode(id, pool)
        else {
            val next = _selectedIds.value.toMutableSet()
            if (!next.add(id)) next.remove(id)
            _selectedIds.value = next
            if (next.isEmpty()) exitSelectMode()
        }
    }

    fun downloadSelected(tracks: List<Track> = selectPool) {
        val chosen = tracks.filter { it.id in _selectedIds.value }
        exitSelectMode()
        if (chosen.isNotEmpty()) downloadAll(chosen)
    }

    /**
     * Download every track that isn't already offline (albums, playlists, liked
     * songs). Runs sequentially to stay friendly to the connection and storage.
     */
    fun downloadAll(tracks: List<Track>) {
        val quality = repo.effectiveQuality()
        val pending = tracks.filter { track ->
            if (track.id in _downloadingIds.value) return@filter false
            val existing = repo.downloadStore.qualityOf(track.id)
            existing == null || existing != quality
        }
        if (pending.isEmpty()) {
            showToast("Already downloaded")
            return
        }
        _downloadingIds.value = _downloadingIds.value + pending.map { it.id }
        showToast("Downloading ${pending.size} track${if (pending.size == 1) "" else "s"}…")
        viewModelScope.launch {
            var ok = 0
            for (track in pending) {
                val existing = repo.downloadStore.qualityOf(track.id)
                val result = withContext(Dispatchers.IO) {
                    repo.download(track, replace = existing != null && existing != quality)
                }
                _downloadingIds.value = _downloadingIds.value - track.id
                if (result.isSuccess) ok++
            }
            showToast("Saved $ok of ${pending.size} for offline")
        }
    }

    /** Home-screen widget: resume, liked, or last mix. Waits for the player to attach. */
    fun handleWidgetAction(action: String) {
        viewModelScope.launch {
            var waits = 0
            while (!player.connected.value && waits < 50) {
                delay(100)
                waits++
            }
            when (action) {
                WidgetActions.PLAY_CONTINUE -> resumeContinueListening()
                WidgetActions.PLAY_LIKED -> {
                    val tracks = library.value.valueOrNull?.likedSongs
                        ?: withContext(Dispatchers.IO) { runCatching { repo.likedSongs() }.getOrDefault(emptyList()) }
                    play(tracks, 0, MusicyLibrary.NODE_LIKED)
                }
                WidgetActions.PLAY_MIX -> {
                    val mixId = WidgetSnapshotStore.read(getApplication()).mixId
                    if (mixId.isNullOrBlank()) {
                        showToast("Play a daily mix once and it will show up here")
                    } else {
                        val mix = withContext(Dispatchers.IO) { runCatching { repo.dailyMix(mixId) }.getOrNull() }
                        if (mix == null) showToast("Couldn't load that mix")
                        else playMix(mix)
                    }
                }
            }
        }
    }

    fun setFollowing(artistId: String, follow: Boolean, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) { repo.setFollowing(artistId, follow) }
            onResult(result)
            showToast(if (result) "Following" else "Unfollowed")
        }
    }

    fun createPlaylist(name: String, onDone: (Playlist?) -> Unit = {}) {
        viewModelScope.launch {
            val playlist = withContext(Dispatchers.IO) { runCatching { repo.createPlaylist(name) }.getOrNull() }
            if (playlist != null) {
                showToast("Created \"${playlist.name}\"")
                loadLibrary(force = true)
            } else {
                showToast("Could not create playlist")
            }
            onDone(playlist)
        }
    }

    fun addToPlaylist(playlistId: String, trackId: String) {
        viewModelScope.launch {
            val ok = withContext(Dispatchers.IO) { runCatching { repo.addToPlaylist(playlistId, listOf(trackId)) }.getOrDefault(false) }
            showToast(if (ok) "Added to playlist" else "Could not add to playlist")
        }
    }

    fun removeFromPlaylist(playlistId: String, trackId: String, onDone: () -> Unit = {}) {
        viewModelScope.launch {
            val ok = withContext(Dispatchers.IO) { runCatching { repo.removeFromPlaylist(playlistId, listOf(trackId)) }.getOrDefault(false) }
            showToast(if (ok) "Removed from playlist" else "Could not remove track")
            if (ok) onDone()
        }
    }

    // -- multi-device -------------------------------------------------------

    fun claimPlaybackHere() {
        SyncHolder.client?.claim()
        showToast("Playing on this device")
    }

    fun transferPlaybackTo(device: SyncDevice) {
        val s = player.state.value
        val pos = player.position.value
        SyncHolder.client?.transferTo(
            targetDeviceId = device.id,
            current = s.currentTrack,
            queue = s.queue,
            index = s.currentIndex,
            position = pos.positionMs / 1000.0,
            duration = s.durationMs / 1000.0,
            playing = s.isPlaying
        )
        showToast("Moving playback to ${device.name}")
    }

    /** Drives the remote device when this phone is only acting as a remote. */
    fun sendRemoteCommand(action: String, seconds: Double? = null, mode: String? = null) {
        SyncHolder.client?.sendCommand(action, seconds = seconds, mode = mode)
    }

    /** True when another device holds playback and we are acting as a remote. */
    val isRemoteControlling: Boolean
        get() {
            val active = _syncActiveDeviceId.value ?: return false
            val us = _thisDeviceId.value
            return us.isNotBlank() && active != us
        }

    // -- settings -----------------------------------------------------------

    // Device-local preferences.
    fun setSyncEnabled(value: Boolean) = device { setSyncEnabled(value) }
    fun setDeviceName(value: String) = device { setDeviceName(value) }
    fun setResumeOnLaunch(value: Boolean) = device { setResumeOnLaunch(value) }
    fun setDownloadOnWifiOnly(value: Boolean) = device { setDownloadOnWifiOnly(value) }
    fun setStreamOnCellular(value: Boolean) = device { setStreamOnCellular(value) }
    fun setDataSaver(value: Boolean) = device { setDataSaver(value) }
    fun setOfflineOnly(value: Boolean) = device { setOfflineOnly(value) }
    fun setHapticFeedback(value: Boolean) = device { setHapticFeedback(value) }

    /** One-tap quality / connectivity mode used by the Settings chips. */
    fun setPlaybackMode(mode: String) {
        viewModelScope.launch {
            when (mode) {
                "data_saver" -> {
                    repo.settingsStore.setOfflineOnly(false)
                    repo.settingsStore.setDataSaver(true)
                }
                "offline" -> {
                    repo.settingsStore.setDataSaver(false)
                    repo.settingsStore.setOfflineOnly(true)
                }
                "lossless" -> {
                    repo.settingsStore.setOfflineOnly(false)
                    repo.settingsStore.setDataSaver(false)
                    repo.settingsStore.setAudioQuality("lossless")
                    repo.pushAccountSettings()
                }
                "high" -> {
                    repo.settingsStore.setOfflineOnly(false)
                    repo.settingsStore.setDataSaver(false)
                    repo.settingsStore.setAudioQuality("high")
                    repo.pushAccountSettings()
                }
                else -> {
                    repo.settingsStore.setOfflineOnly(false)
                    repo.settingsStore.setDataSaver(false)
                    repo.settingsStore.setAudioQuality("auto")
                    repo.pushAccountSettings()
                }
            }
        }
    }

    fun syncLibraryOffline() {
        showToast("Saving library for offline…")
        viewModelScope.launch {
            val count = withContext(Dispatchers.IO) { runCatching { repo.syncLibraryForOffline() }.getOrDefault(0) }
            showToast(if (count > 0) "Library saved for offline ($count items)" else "Couldn't sync. Check your connection.")
        }
    }
    fun setSkipSilence(value: Boolean) = device { setSkipSilence(value) }
    fun setSeekStep(value: Int) = device { setSeekStepSeconds(value) }

    fun setPlaybackSpeed(value: Float) = device {
        setPlaybackSpeed(value)
        player.setPlaybackSpeed(value)
    }

    // Account-wide preferences: saved locally, then pushed so they follow the
    // user to the web app and survive a reinstall.
    fun setAutoplay(value: Boolean) = account { setAutoplayRecommendations(value) }
    fun setGapless(value: Boolean) = account { setGaplessPlayback(value) }
    fun setPrivateSession(value: Boolean) = account { setPrivateSession(value) }
    fun setAllowScrobbling(value: Boolean) = account { setAllowScrobbling(value) }
    fun setNormalizeVolume(value: Boolean) = account { setNormalizeVolume(value) }
    fun setAudioQuality(value: String) = account { setAudioQuality(value) }
    fun setPreferSyncedLyrics(value: Boolean) = account { setPreferSyncedLyrics(value) }
    fun setAutoRomanize(value: Boolean) = account { setAutoRomanizeLyrics(value) }
    fun setRomanizeLanguage(value: String) = account { setRomanizeLanguage(value) }
    fun setRomanizeAlongside(value: Boolean) = account { setShowRomanizationAlongside(value) }
    fun setReducedMotion(value: Boolean) = account { setReducedMotion(value) }
    fun setShowNowPlayingNotifications(value: Boolean) = account { setShowNowPlayingNotifications(value) }

    fun setDefaultVolume(value: Float) = account {
        setDefaultVolume(value)
        player.setVolume(value)
    }

    /**
     * Hands the phone's own equaliser the session Musicy is playing on.
     *
     * Most Android skins (Samsung's very much included) ship one; there is no
     * point shipping a worse copy inside the app.
     */
    fun openEqualizer() {
        val app = getApplication<Application>()
        val intent = Intent(AudioEffect.ACTION_DISPLAY_AUDIO_EFFECT_CONTROL_PANEL).apply {
            putExtra(AudioEffect.EXTRA_AUDIO_SESSION, AudioEngineState.audioSessionId.value)
            putExtra(AudioEffect.EXTRA_PACKAGE_NAME, app.packageName)
            putExtra(AudioEffect.EXTRA_CONTENT_TYPE, AudioEffect.CONTENT_TYPE_MUSIC)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val launched = runCatching { app.startActivity(intent) }.isSuccess
        if (!launched) showToast("No equaliser app on this phone")
    }

    fun resetSettings() {
        viewModelScope.launch {
            repo.settingsStore.resetToDefaults()
            showToast("Settings reset")
        }
    }

    private inline fun device(crossinline block: suspend app.serika.musicy.mobile.data.preferences.AppSettingsStore.() -> Unit): Job =
        viewModelScope.launch { repo.settingsStore.block() }

    private inline fun account(crossinline block: suspend app.serika.musicy.mobile.data.preferences.AppSettingsStore.() -> Unit): Job =
        viewModelScope.launch {
            repo.settingsStore.block()
            repo.pushAccountSettings()
        }

    fun signOut() {
        viewModelScope.launch {
            player.stop()
            repo.signOut()
        }
    }

    fun showToast(message: String) {
        _toast.value = message
    }

    fun consumeToast() {
        _toast.value = null
    }
}

/** Network failures should read like a sentence, not a stack trace. */
fun Throwable.friendlyMessage(): String = when (this) {
    is retrofit2.HttpException -> when (code()) {
        401, 403 -> "Your session expired. Sign in again from Settings."
        404 -> "Not found on this server."
        in 500..599 -> "The server had a problem. Try again shortly."
        else -> "Request failed (${code()})."
    }
    is java.net.UnknownHostException -> "Can't reach the server. Check your connection."
    is java.net.SocketTimeoutException -> "The server took too long to respond."
    else -> localizedMessage ?: "Something went wrong."
}
