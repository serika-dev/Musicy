package app.serika.musicy.mobile.ui.viewmodel

import android.app.Application
import android.content.Intent
import android.media.audiofx.AudioEffect
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.player.AudioEngineState
import app.serika.musicy.mobile.player.MusicyLibrary
import app.serika.musicy.mobile.player.PlayerConnection
import app.serika.musicy.mobile.player.SyncHolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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

    private val _home = MutableStateFlow<Async<HomeState>>(Async.Loading)
    val home: StateFlow<Async<HomeState>> = _home.asStateFlow()

    private val _library = MutableStateFlow<Async<LibraryState>>(Async.Loading)
    val library: StateFlow<Async<LibraryState>> = _library.asStateFlow()

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
        viewModelScope.launch {
            // Off the main thread, before any queue is built.
            withContext(Dispatchers.IO) { repo.downloadStore.warmUp() }
            repo.pullAccountSettings()
        }
        viewModelScope.launch { repo.ensureLikedIdsLoaded() }
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

    fun loadHome(force: Boolean = false) {
        if (!force && _home.value is Async.Success) return
        viewModelScope.launch {
            _home.value = Async.Loading
            _home.value = runCatching {
                withContext(Dispatchers.IO) {
                    // Fired together rather than one after another: six serial
                    // round-trips made the home screen feel broken on a slow
                    // connection.
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
            }.fold(
                onSuccess = { Async.Success(it) },
                onFailure = { Async.Failure(it.friendlyMessage()) }
            )
        }
    }

    fun loadLibrary(force: Boolean = false) {
        if (!force && _library.value is Async.Success) return
        viewModelScope.launch {
            _library.value = Async.Loading
            _library.value = runCatching {
                withContext(Dispatchers.IO) {
                    coroutineScope {
                        val liked = async { runCatching { repo.likedSongs() }.getOrDefault(emptyList()) }
                        val playlists = async { runCatching { repo.playlists(limit = 50) }.getOrDefault(emptyList()) }
                        val followed = async { repo.followedArtists() }
                        val recent = async { repo.recentlyPlayed() }
                        val albums = async { runCatching { repo.albums(limit = 30).albums }.getOrDefault(emptyList()) }
                        LibraryState(
                            likedSongs = liked.await(),
                            playlists = playlists.await(),
                            followedArtists = followed.await(),
                            recentlyPlayed = recent.await(),
                            albums = albums.await()
                        )
                    }
                }
            }.fold(
                onSuccess = { Async.Success(it) },
                onFailure = { Async.Failure(it.friendlyMessage()) }
            )
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
        val playable = tracks.filter { !it.filePath.isNullOrBlank() }
        if (playable.isEmpty()) {
            showToast("Nothing playable here yet")
            return
        }
        player.play(tracks, startIndex, contextId)
    }

    fun playAlbum(album: Album, startIndex: Int = 0) =
        play(album.tracks.orEmpty(), startIndex, MusicyLibrary.albumId(album.id))

    fun playPlaylist(playlist: Playlist, startIndex: Int = 0) =
        play(playlist.trackList(), startIndex, MusicyLibrary.playlistId(playlist.id))

    fun playMix(mix: DailyMix, startIndex: Int = 0) =
        play(mix.tracks.orEmpty(), startIndex, MusicyLibrary.mixId(mix.id))

    fun shuffle(tracks: List<Track>, contextId: String? = null) {
        val playable = tracks.filter { !it.filePath.isNullOrBlank() }
        if (playable.isEmpty()) {
            showToast("Nothing playable here yet")
            return
        }
        player.play(playable.shuffled(), 0, contextId)
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
        SyncHolder.client?.transferTo(device.id)
        showToast("Moving playback to ${device.name}")
    }

    /** Drives the remote device when this phone is only acting as a remote. */
    fun sendRemoteCommand(action: String, seconds: Double? = null) {
        SyncHolder.client?.sendCommand(action, seconds = seconds)
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
    fun setHapticFeedback(value: Boolean) = device { setHapticFeedback(value) }
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
