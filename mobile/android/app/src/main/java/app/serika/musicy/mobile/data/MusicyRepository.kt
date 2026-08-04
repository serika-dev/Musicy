package app.serika.musicy.mobile.data

import android.content.Context
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.api.MusicyApi
import app.serika.musicy.mobile.data.downloads.DownloadStore
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.data.preferences.AppSettings
import app.serika.musicy.mobile.data.preferences.AppSettingsStore
import app.serika.musicy.mobile.data.preferences.PlaybackStateStore
import app.serika.musicy.mobile.data.preferences.SearchHistoryStore
import app.serika.musicy.mobile.data.preferences.ServerConfigStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Single source of truth for server data, shared by the UI, the playback
 * service and Android Auto. Holding one instance keeps the liked-songs cache
 * and the resolved [ServerConfig] consistent across all three.
 */
class MusicyRepository private constructor(context: Context) {

    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val serverConfigStore = ServerConfigStore(appContext)
    val settingsStore = AppSettingsStore(appContext)
    val downloadStore = DownloadStore(appContext)
    val playbackStateStore = PlaybackStateStore(appContext)
    val searchHistoryStore = SearchHistoryStore(appContext)

    private val _config = MutableStateFlow(ServerConfig())
    val config: StateFlow<ServerConfig> = _config.asStateFlow()

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private val _likedTrackIds = MutableStateFlow<Set<String>>(emptySet())
    val likedTrackIds: StateFlow<Set<String>> = _likedTrackIds.asStateFlow()

    private val likedMutex = Mutex()
    private var likedLoaded = false

    init {
        scope.launch { serverConfigStore.config.collect { _config.value = it } }
        scope.launch { settingsStore.settings.collect { _settings.value = it } }
    }

    val api: MusicyApi get() = ApiClient.create(_config.value)

    /** Suspends until the user has finished setup, then returns the config. */
    suspend fun awaitConfig(): ServerConfig =
        _config.value.takeIf { it.isConfigured } ?: config.filter { it.isConfigured }.first()

    /** Absolute URL for a possibly-relative cover/audio path. */
    fun resolveUrl(path: String?): String? = ApiClient.absoluteUrl(_config.value, path)

    /**
     * Where the player should actually stream a track from: the downloaded
     * copy when one exists, otherwise the server.
     */
    fun playbackUrl(track: Track): String? =
        downloadStore.localUri(track.id) ?: resolveUrl(track.filePath)

    fun isDownloaded(trackId: String): Boolean = downloadStore.isDownloaded(trackId)

    val downloads get() = downloadStore.downloads

    suspend fun download(track: Track): Result<Unit> {
        val url = resolveUrl(track.filePath) ?: return Result.failure(IllegalStateException("Track has no file"))
        return downloadStore.download(track, ApiClient.okHttp(_config.value), url).map { }
    }

    suspend fun removeDownload(trackId: String) = downloadStore.remove(trackId)

    suspend fun clearDownloads() = downloadStore.clear()

    suspend fun signOut() {
        serverConfigStore.clear()
        playbackStateStore.clear()
        // The next person to sign in on this phone should not inherit the last
        // account's searches.
        searchHistoryStore.clear()
        _likedTrackIds.value = emptySet()
        likedLoaded = false
    }

    // -- home ---------------------------------------------------------------

    suspend fun feed(): FeedResponse = api.getFeed()

    suspend fun dailyMixes(): List<DailyMix> = api.getDailyMixes()

    suspend fun dailyMix(id: String): DailyMix = api.getDailyMix(id)

    suspend fun genres(): List<Genre> = api.getGenres().genres

    // -- catalogue ----------------------------------------------------------

    suspend fun albums(limit: Int = 40, offset: Int = 0, genre: String? = null): AlbumsResponse =
        api.getAlbums(limit = limit, offset = offset, genre = genre)

    suspend fun album(id: String): Album = api.getAlbum(id)

    suspend fun artists(limit: Int = 40, offset: Int = 0, search: String? = null): ArtistsResponse =
        api.getArtists(limit = limit, offset = offset, search = search)

    suspend fun artist(id: String): Artist = api.getArtist(id)

    suspend fun artistTracks(id: String, limit: Int = 100): List<Track> =
        api.getArtistTracks(id, limit = limit).tracks

    suspend fun artistAlbums(id: String, limit: Int = 50): List<Album> =
        runCatching { api.getArtistAlbums(id, limit).albums }.getOrDefault(emptyList())

    suspend fun tracks(limit: Int = 50, offset: Int = 0, genre: String? = null): TracksResponse =
        api.getTracks(limit = limit, offset = offset, genre = genre)

    suspend fun track(id: String): Track = api.getTrack(id)

    suspend fun lyrics(id: String): LyricsResponse = api.getLyrics(id)

    /**
     * Romanized lyrics for a track. The server caches the result per track, so
     * only the first request for a song is slow.
     *
     * @param mode "synced" or "plain", matching the lyrics being displayed.
     */
    suspend fun romanizedLyrics(trackId: String, mode: String): String? {
        val language = _settings.value.romanizeLanguage.takeIf { it != "auto" }
        return runCatching {
            api.romanize(RomanizeRequest(trackId = trackId, mode = mode, language = language)).romanized
        }.getOrNull()?.takeIf { it.isNotBlank() }
    }

    suspend fun search(query: String, limit: Int = 20): SearchResponse =
        api.search(query = query, limit = limit)

    // -- playlists ----------------------------------------------------------

    suspend fun playlists(limit: Int = 50, offset: Int = 0): List<Playlist> =
        api.getPlaylists(limit = limit, offset = offset).playlists

    suspend fun playlist(id: String): Playlist = api.getPlaylist(id)

    suspend fun createPlaylist(name: String, description: String? = null, isPublic: Boolean = true): Playlist =
        api.createPlaylist(CreatePlaylistRequest(name = name, description = description, isPublic = isPublic))

    suspend fun addToPlaylist(playlistId: String, trackIds: List<String>): Boolean =
        api.addTracksToPlaylist(playlistId, PlaylistTracksRequest(trackIds)).isSuccessful

    suspend fun removeFromPlaylist(playlistId: String, trackIds: List<String>): Boolean =
        api.removeTracksFromPlaylist(playlistId, PlaylistTracksRequest(trackIds)).isSuccessful

    // -- library ------------------------------------------------------------

    suspend fun profile(): User = api.getProfile()

    /**
     * Pulls account-wide settings so preferences follow the user across
     * devices, reinstalls and app updates.
     */
    suspend fun pullAccountSettings() {
        val remote = runCatching { api.getUserSettings() }.getOrNull() ?: return
        settingsStore.applyFromAccount(remote)
    }

    /** Pushes the account-scoped slice back up. Failures are not fatal. */
    fun pushAccountSettings() {
        scope.launch {
            runCatching { api.putUserSettings(_settings.value.toUserSettings()) }
        }
    }

    suspend fun likedSongs(limit: Int = 200): List<Track> {
        val tracks = api.getLikedSongs(limit = limit).tracks
        likedMutex.withLock {
            _likedTrackIds.value = tracks.map { it.id }.toSet()
            likedLoaded = true
        }
        return tracks
    }

    /** Loads the liked-id set once so like buttons render correctly everywhere. */
    suspend fun ensureLikedIdsLoaded() {
        if (likedLoaded) return
        runCatching { likedSongs() }
    }

    fun isLiked(trackId: String): Boolean = trackId in _likedTrackIds.value

    /** Optimistically flips the like, rolling back if the server refuses. */
    suspend fun toggleLike(trackId: String): Boolean {
        val wasLiked = isLiked(trackId)
        likedMutex.withLock {
            _likedTrackIds.value = if (wasLiked) {
                _likedTrackIds.value - trackId
            } else {
                _likedTrackIds.value + trackId
            }
        }
        val ok = runCatching {
            if (wasLiked) api.unlikeTrack(trackId).isSuccessful else api.likeTrack(LikeRequest(trackId)).isSuccessful
        }.getOrDefault(false)
        if (!ok) {
            likedMutex.withLock {
                _likedTrackIds.value = if (wasLiked) {
                    _likedTrackIds.value + trackId
                } else {
                    _likedTrackIds.value - trackId
                }
            }
            return wasLiked
        }
        return !wasLiked
    }

    suspend fun recentlyPlayed(): List<Track> =
        runCatching { api.getRecentlyPlayed().tracks }.getOrDefault(emptyList())

    suspend fun followedArtists(limit: Int = 50): List<Artist> =
        runCatching { api.getFollowedArtists(limit = limit).artists }.getOrDefault(emptyList())

    suspend fun isFollowing(artistId: String): Boolean =
        runCatching { api.getFollowState(artistId).isFollowing }.getOrDefault(false)

    suspend fun setFollowing(artistId: String, follow: Boolean): Boolean {
        val response = runCatching {
            if (follow) api.followArtist(artistId) else api.unfollowArtist(artistId)
        }.getOrNull()
        return if (response?.isSuccessful == true) follow else !follow
    }

    /** Fire-and-forget play scrobble; skipped in a private session or opt-out. */
    fun recordPlay(trackId: String, seconds: Int, context: PlayContext? = null) {
        if (_settings.value.privateSession || !_settings.value.allowScrobbling) return
        scope.launch {
            runCatching { api.recordPlay(PlayRequest(trackId = trackId, duration = seconds, context = context)) }
        }
    }

    suspend fun devices(): List<SyncDevice> =
        runCatching { api.getDevices().devices }.getOrDefault(emptyList())

    companion object {
        @Volatile
        private var instance: MusicyRepository? = null

        fun get(context: Context): MusicyRepository =
            instance ?: synchronized(this) {
                instance ?: MusicyRepository(context).also { instance = it }
            }
    }
}
