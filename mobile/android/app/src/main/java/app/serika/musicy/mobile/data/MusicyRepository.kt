package app.serika.musicy.mobile.data

import android.content.Context
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.api.MusicyApi
import app.serika.musicy.mobile.data.cache.CatalogueCache
import app.serika.musicy.mobile.data.downloads.DownloadStore
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.data.network.ConnectivityMonitor
import app.serika.musicy.mobile.data.network.NetworkStatus
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
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.serializer
import java.io.IOException

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
    val catalogueCache = CatalogueCache(appContext)
    val connectivity = ConnectivityMonitor(appContext)

    private val _config = MutableStateFlow(ServerConfig())
    val config: StateFlow<ServerConfig> = _config.asStateFlow()

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private val _likedTrackIds = MutableStateFlow<Set<String>>(emptySet())
    val likedTrackIds: StateFlow<Set<String>> = _likedTrackIds.asStateFlow()

    private val likedMutex = Mutex()
    private var likedLoaded = false

    init {
        // A corrupt preferences file must not take the app down on launch: the
        // catch falls back to defaults for that emission and lets the store
        // recover on its next good read.
        scope.launch {
            serverConfigStore.config.catch { }.collect { _config.value = it }
        }
        scope.launch {
            settingsStore.settings.catch { }.collect { _settings.value = it }
        }
        // The download index is scanned off the main thread. This used to be a
        // runBlocking here, which blocked startup for the whole scan — with a
        // few hundred downloads that froze the app long enough to trigger ANR
        // dialogs. Playback paths that must not stream an already-downloaded
        // file await the scan via [awaitDownloadScan] instead.
        scope.launch {
            runCatching { downloadStore.warmUp() }
        }
    }

    /** Suspends until the download index has been read from disk. */
    suspend fun awaitDownloadScan() = downloadStore.ensureScanned()

    val api: MusicyApi get() = ApiClient.create(_config.value)

    /** Suspends until the user has finished setup, then returns the config. */
    suspend fun awaitConfig(): ServerConfig =
        _config.value.takeIf { it.isConfigured } ?: config.filter { it.isConfigured }.first()

    /** Absolute URL for a possibly-relative cover/audio path. */
    fun resolveUrl(path: String?): String? = ApiClient.absoluteUrl(_config.value, path)

    val network: StateFlow<NetworkStatus> get() = connectivity.status

    /** Quality sent to /stream and /download after data-saver / lossless overrides. */
    fun effectiveQuality(): String {
        val settings = _settings.value
        if (settings.dataSaver) return "low"
        return settings.audioQuality.ifBlank { "auto" }
    }

    fun isOfflineLocked(): Boolean {
        val settings = _settings.value
        if (settings.offlineOnly) return true
        return !connectivity.current().online
    }

    fun shouldPlayLocalOnly(): Boolean {
        val settings = _settings.value
        if (settings.offlineOnly) return true
        val net = connectivity.current()
        if (!net.online) return true
        if (!settings.streamOnCellular && net.cellular && !net.wifi) return true
        return false
    }

    /**
     * Where the player should actually stream a track from: the downloaded
     * copy when one exists, otherwise the quality-aware stream endpoint (which
     * 302-redirects to the rendition matching the user's chosen quality).
     */
    fun playbackUrl(track: Track): String? {
        downloadStore.localUri(track.id)?.let { return it }
        if (shouldPlayLocalOnly()) return null
        val base = ApiClient.normalizedBaseUrl(_config.value)
        val quality = effectiveQuality()
        return "$base/api/tracks/${track.id}/stream?quality=$quality"
    }

    fun isDownloaded(trackId: String): Boolean = downloadStore.isDownloaded(trackId)

    val downloads get() = downloadStore.downloads

    suspend fun download(track: Track, replace: Boolean = false): Result<Unit> {
        val net = connectivity.current()
        if (_settings.value.downloadOnWifiOnly && net.online && !net.wifi) {
            return Result.failure(IOException("Waiting for Wi-Fi to download"))
        }
        val quality = effectiveQuality()
        val existingQuality = downloadStore.qualityOf(track.id)
        if (downloadStore.isDownloaded(track.id) && existingQuality == quality && !replace) {
            return Result.success(Unit)
        }
        val config = _config.value
        val base = ApiClient.normalizedBaseUrl(config)
        val url = "$base/api/tracks/${track.id}/download?quality=$quality"
        return downloadStore.download(track, ApiClient.downloadOkHttp(config), url, quality).map { }
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

    suspend fun feed(): FeedResponse = cached(CatalogueCache.FEED, serializer()) { api.getFeed() }

    suspend fun dailyMixes(): List<DailyMix> =
        cached(CatalogueCache.DAILY_MIXES, ListSerializer(serializer())) { api.getDailyMixes() }

    suspend fun dailyMix(id: String): DailyMix =
        cached(CatalogueCache.mix(id), serializer()) { api.getDailyMix(id) }

    suspend fun genres(): List<Genre> =
        cached(CatalogueCache.GENRES, ListSerializer(serializer())) { api.getGenres().genres }

    // -- catalogue ----------------------------------------------------------

    suspend fun albums(limit: Int = 40, offset: Int = 0, genre: String? = null): AlbumsResponse {
        if (offset == 0 && genre == null) {
            return cached(CatalogueCache.ALBUMS, serializer()) { api.getAlbums(limit = limit, offset = 0) }
        }
        return api.getAlbums(limit = limit, offset = offset, genre = genre)
    }

    suspend fun album(id: String): Album = cached(CatalogueCache.album(id), serializer()) { api.getAlbum(id) }

    suspend fun artists(limit: Int = 40, offset: Int = 0, search: String? = null): ArtistsResponse {
        if (offset == 0 && search == null) {
            return cached(CatalogueCache.ARTISTS, serializer()) { api.getArtists(limit = limit, offset = 0) }
        }
        return api.getArtists(limit = limit, offset = offset, search = search)
    }

    suspend fun artist(id: String): Artist =
        cached(CatalogueCache.artist(id), serializer()) { api.getArtist(id) }

    /** Every published song for an artist, including features. Pages until done. */
    suspend fun artistTracks(id: String, limit: Int = 200): List<Track> {
        val key = CatalogueCache.artistTracks(id)
        if (isOfflineLocked()) {
            return catalogueCache.read(key, ListSerializer(serializer<Track>())) ?: emptyList()
        }
        return runCatching {
            val all = mutableListOf<Track>()
            var offset = 0
            while (true) {
                val page = api.getArtistTracks(id, limit = limit, offset = offset)
                all += page.tracks
                if (!page.hasMore || page.tracks.isEmpty()) break
                offset += page.tracks.size
                if (offset > 5000) break
            }
            val unique = all.distinctBy { it.id }
            catalogueCache.write(key, unique, ListSerializer(serializer()))
            unique
        }.getOrElse { err ->
            catalogueCache.read(key, ListSerializer(serializer<Track>())) ?: throw err
        }
    }

    suspend fun artistAlbums(id: String, limit: Int = 200): List<Album> {
        val key = CatalogueCache.artistAlbums(id)
        if (isOfflineLocked()) {
            return catalogueCache.read(key, ListSerializer(serializer<Album>())) ?: emptyList()
        }
        return runCatching {
            val page = api.getArtistAlbums(id, limit)
            catalogueCache.write(key, page.albums, ListSerializer(serializer()))
            page.albums
        }.getOrElse {
            catalogueCache.read(key, ListSerializer(serializer<Album>())) ?: emptyList()
        }
    }

    suspend fun tracks(limit: Int = 50, offset: Int = 0, genre: String? = null): TracksResponse =
        api.getTracks(limit = limit, offset = offset, genre = genre)

    suspend fun track(id: String): Track = cached(CatalogueCache.track(id), serializer()) { api.getTrack(id) }

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

    suspend fun playlists(limit: Int = 50, offset: Int = 0): List<Playlist> {
        if (offset == 0) {
            return cached(CatalogueCache.PLAYLISTS, ListSerializer(serializer())) {
                api.getPlaylists(limit = limit, offset = 0).playlists
            }
        }
        return api.getPlaylists(limit = limit, offset = offset).playlists
    }

    suspend fun playlist(id: String): Playlist =
        cached(CatalogueCache.playlist(id), serializer()) { api.getPlaylist(id) }

    suspend fun createPlaylist(name: String, description: String? = null, isPublic: Boolean = true): Playlist =
        api.createPlaylist(CreatePlaylistRequest(name = name, description = description, isPublic = isPublic))

    suspend fun addToPlaylist(playlistId: String, trackIds: List<String>): Boolean =
        api.addTracksToPlaylist(playlistId, PlaylistTracksRequest(trackIds)).isSuccessful

    suspend fun removeFromPlaylist(playlistId: String, trackIds: List<String>): Boolean =
        api.removeTracksFromPlaylist(playlistId, PlaylistTracksRequest(trackIds)).isSuccessful

    // -- library ------------------------------------------------------------

    suspend fun profile(): User = cached(CatalogueCache.PROFILE, serializer()) { api.getProfile() }

    /**
     * Pulls the user's library metadata onto disk so the app can be browsed
     * with no network: liked songs, playlists, followed artists and their
     * catalogues, recently played, home feed.
     */
    suspend fun syncLibraryForOffline(): Int {
        var saved = 0
        fun tally() { saved++ }

        runCatching { likedSongs() }.onSuccess { tally() }
        runCatching { recentlyPlayed() }.onSuccess { tally() }
        runCatching { feed() }.onSuccess { tally() }
        runCatching { dailyMixes() }.onSuccess { tally() }
        runCatching { genres() }.onSuccess { tally() }
        runCatching { profile() }.onSuccess { tally() }

        val lists = runCatching { playlists(limit = 100) }.getOrDefault(emptyList())
        tally()
        lists.forEach { runCatching { playlist(it.id) }.onSuccess { tally() } }

        val followed = runCatching { followedArtists(limit = 200) }.getOrDefault(emptyList())
        tally()
        followed.forEach { artist ->
            runCatching { artist(artist.id) }.onSuccess { tally() }
            runCatching { artistTracks(artist.id) }.onSuccess { tally() }
            runCatching { artistAlbums(artist.id) }.onSuccess { tally() }
        }

        // Warm cache for already-downloaded tracks so their pages render offline.
        downloadStore.current().forEach { item ->
            runCatching { track(item.track.id) }.onSuccess { tally() }
            item.track.album?.id?.let { runCatching { album(it) }.onSuccess { tally() } }
            item.track.artist?.id?.let { id ->
                runCatching { artist(id) }.onSuccess { tally() }
            }
        }
        return saved
    }

    private suspend fun <T> cached(
        key: String,
        serializer: kotlinx.serialization.KSerializer<T>,
        fetch: suspend () -> T
    ): T {
        if (isOfflineLocked()) {
            return catalogueCache.read(key, serializer)
                ?: throw IOException("You're offline. Sync your library in Settings to keep browsing.")
        }
        return try {
            fetch().also { catalogueCache.write(key, it, serializer) }
        } catch (err: Exception) {
            catalogueCache.read(key, serializer) ?: throw err
        }
    }

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
        val tracks = cached(CatalogueCache.LIKED, ListSerializer(serializer())) {
            val all = mutableListOf<Track>()
            var offset = 0
            while (true) {
                val page = api.getLikedSongs(limit = limit, offset = offset)
                all += page.tracks
                if (!page.hasMore || page.tracks.isEmpty()) break
                offset += page.tracks.size
            }
            all.distinctBy { it.id }
        }
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
        runCatching {
            cached(CatalogueCache.RECENT, ListSerializer(serializer())) { api.getRecentlyPlayed().tracks }
        }.getOrDefault(emptyList())

    suspend fun followedArtists(limit: Int = 100): List<Artist> =
        runCatching {
            cached(CatalogueCache.FOLLOWED, ListSerializer(serializer())) {
                api.getFollowedArtists(limit = limit).artists
            }
        }.getOrDefault(emptyList())

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
