package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Album
import app.serika.musicy.mobile.data.model.Artist
import app.serika.musicy.mobile.data.model.DailyMix
import app.serika.musicy.mobile.data.model.Playlist
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.player.MusicyLibrary
import app.serika.musicy.mobile.ui.CollectionKind
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.*
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.Async
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import app.serika.musicy.mobile.ui.viewmodel.friendlyMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Loads a value once per [key] and exposes it as an [Async]. */
@Composable
fun <T> loadAsync(key: Any?, loader: suspend () -> T): State<Async<T>> = produceState<Async<T>>(
    initialValue = Async.Loading,
    key1 = key
) {
    value = Async.Loading
    value = runCatching { withContext(Dispatchers.IO) { loader() } }.fold(
        onSuccess = { Async.Success(it) },
        onFailure = { Async.Failure(it.friendlyMessage()) }
    )
}

/**
 * The hero block every detail page starts with: large art, title, meta line
 * and the play/shuffle pair — the phone version of the web app's page header.
 */
@Composable
private fun DetailHero(
    title: String,
    subtitle: String,
    meta: String?,
    artworkUrl: String?,
    circular: Boolean = false,
    accent: Color = Primary,
    isPlaying: Boolean = false,
    bannerUrl: String? = null,
    onPlay: () -> Unit,
    onShuffle: () -> Unit,
    trailing: (@Composable RowScope.() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(accent.copy(alpha = 0.35f), Color.Transparent)))
            .padding(bottom = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Artist banner: a wide image at the top that fades into the background.
        if (!bannerUrl.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                Artwork(
                    url = bannerUrl,
                    contentDescription = "$title banner",
                    shape = RoundedCornerShape(0.dp),
                    modifier = Modifier.fillMaxSize()
                )
                // Gradient fade at the bottom of the banner.
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, MaterialTheme.colorScheme.background)
                            )
                        )
                )
            }
        }
        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(8.dp))
            Artwork(
                url = artworkUrl,
                contentDescription = title,
                shape = if (circular) CircleShape else RoundedCornerShape(12.dp),
                modifier = Modifier.size(190.dp)
            )
            Spacer(Modifier.height(16.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineLarge,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(4.dp))
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = OnSurfaceVariant, textAlign = TextAlign.Center)
            if (!meta.isNullOrBlank()) {
                Text(meta, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
            }
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                trailing?.invoke(this)
                OutlinedButton(onClick = onShuffle) {
                    Icon(Icons.Default.Shuffle, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Shuffle")
                }
                PlayPauseButton(isPlaying = isPlaying, onClick = onPlay, size = 56.dp)
            }
        }
    }
}

/**
 * Round icon button that saves a whole collection offline. Reflects live state:
 * a spinner while any of its tracks are downloading, a filled "done" glyph once
 * every track is offline, otherwise the download glyph.
 */
@Composable
private fun DownloadAllButton(vm: MusicyViewModel, tracks: List<Track>) {
    if (tracks.isEmpty()) return
    val downloadedIds by vm.downloadedIds.collectAsState()
    val downloadingIds by vm.downloadingIds.collectAsState()
    val ids = tracks.map { it.id }
    val busy = ids.any { it in downloadingIds }
    val allDone = ids.all { it in downloadedIds }
    FilledTonalIconButton(
        onClick = { if (!busy) vm.downloadAll(tracks) },
        enabled = !busy && !allDone,
        modifier = Modifier.size(56.dp)
    ) {
        when {
            busy -> CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            allDone -> Icon(Icons.Default.DownloadDone, contentDescription = "Downloaded", tint = Primary)
            else -> Icon(Icons.Default.Download, contentDescription = "Download all")
        }
    }
}

/** Wraps a detail page with a back-arrow app bar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailScaffold(
    titleWhenScrolled: String,
    nav: Nav,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(titleWhenScrolled, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { BackButton(nav::back) },
                actions = actions,
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Transparent,
        content = content
    )
}

// ---------------------------------------------------------------------------
// Album
// ---------------------------------------------------------------------------

@Composable
fun AlbumScreen(vm: MusicyViewModel, nav: Nav, albumId: String) {
    val album by loadAsync(albumId) { vm.repo.album(albumId) }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    DetailScaffold(titleWhenScrolled = album.valueOrNull?.title ?: "Album", nav = nav) { padding ->
        when (val state = album) {
            is Async.Loading -> DetailSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val data: Album = state.value
                val tracks = data.tracks.orEmpty()
                val contextId = MusicyLibrary.albumId(data.id)
                LazyColumn(contentPadding = padding) {
                    item {
                        DetailHero(
                            title = data.title,
                            subtitle = data.artist?.name.orEmpty(),
                            meta = listOfNotNull(
                                data.albumType?.lowercase()?.replaceFirstChar { it.uppercase() },
                                data.year,
                                "${tracks.size} tracks"
                            ).joinToString(" · "),
                            artworkUrl = vm.repo.resolveUrl(data.coverImageUrl),
                            isPlaying = playback.isPlaying && tracks.any { it.id == playback.currentTrack?.id },
                            onPlay = { vm.play(tracks, 0, contextId) },
                            onShuffle = { vm.shuffle(tracks, contextId) },
                            trailing = { DownloadAllButton(vm, tracks) }
                        )
                    }
                    if (tracks.isEmpty()) {
                        item {
                            EmptyState("No tracks here yet", "This album doesn't have any published tracks.")
                        }
                    }
                    trackItems(
                        tracks = tracks,
                        likedIds = liked,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        numbered = true,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl ?: data.coverImageUrl) },
                        onPlay = { index -> vm.play(tracks, index, contextId) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                    data.artist?.let { artist ->
                        item {
                            MusicyDivider(Modifier.padding(vertical = 8.dp))
                            ListRow(
                                title = artist.name,
                                subtitle = "Go to artist",
                                imageUrl = vm.repo.resolveUrl(artist.imageUrl),
                                icon = Icons.Default.Person,
                                circular = true,
                                onClick = { nav.artist(artist.id) }
                            )
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

// ---------------------------------------------------------------------------
// Artist
// ---------------------------------------------------------------------------

@Composable
fun ArtistScreen(vm: MusicyViewModel, nav: Nav, artistId: String) {
    val artist by loadAsync(artistId) { vm.repo.artist(artistId) }
    val tracks by loadAsync("tracks-$artistId") { vm.repo.artistTracks(artistId) }
    val albums by loadAsync("albums-$artistId") { vm.repo.artistAlbums(artistId) }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }
    var following by remember(artistId) { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(artistId, artist) {
        val known = artist.valueOrNull?.isFollowing
        following = known ?: withContext(Dispatchers.IO) { vm.repo.isFollowing(artistId) }
    }

    DetailScaffold(titleWhenScrolled = artist.valueOrNull?.name ?: "Artist", nav = nav) { padding ->
        when (val state = artist) {
            is Async.Loading -> DetailSkeleton(circular = true, modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val data: Artist = state.value
                val allTracks = tracks.valueOrNull.orEmpty()
                val popular = data.topTracks?.takeIf { it.isNotEmpty() } ?: allTracks.take(10)
                val contextId = MusicyLibrary.artistId(data.id)
                val artistAlbums = data.albums ?: albums.valueOrNull.orEmpty()
                val playQueue = allTracks.ifEmpty { popular }
                val trackCount = data.count?.tracks ?: allTracks.size

                LazyColumn(contentPadding = padding) {
                    item {
                        DetailHero(
                            title = data.name,
                            subtitle = listOfNotNull(
                                if (data.verified == true) "Verified artist" else "Artist",
                                data.count?.followers?.let { "$it followers" }
                            ).joinToString(" · "),
                            meta = trackCount.takeIf { it > 0 }?.let { "$it tracks" },
                            artworkUrl = vm.repo.resolveUrl(data.imageUrl),
                            circular = true,
                            bannerUrl = vm.repo.resolveUrl(data.bannerUrl),
                            isPlaying = playback.isPlaying && playQueue.any { it.id == playback.currentTrack?.id },
                            onPlay = { vm.play(playQueue, 0, contextId) },
                            onShuffle = { vm.shuffle(playQueue, contextId) },
                            trailing = {
                                DownloadAllButton(vm, playQueue)
                                val isFollowing = following == true
                                OutlinedButton(
                                    onClick = {
                                        vm.setFollowing(data.id, !isFollowing) { following = it }
                                    }
                                ) {
                                    Icon(
                                        if (isFollowing) Icons.Default.PersonRemove else Icons.Default.PersonAdd,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(if (isFollowing) "Following" else "Follow")
                                }
                            }
                        )
                    }

                    if (!data.bio.isNullOrBlank()) {
                        item {
                            Text(
                                data.bio,
                                style = MaterialTheme.typography.bodyMedium,
                                color = OnSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                    }

                    if (popular.isNotEmpty()) {
                        item {
                            SectionHeader(
                                "Popular",
                                actionLabel = if (allTracks.size > popular.size || trackCount > popular.size) "See all" else null,
                                onAction = { nav.artistTracks(data.id) }
                            )
                        }
                        trackItems(
                            tracks = popular.take(10),
                            likedIds = liked,
                            currentTrackId = playback.currentTrack?.id,
                            isPlaying = playback.isPlaying,
                            resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                            onPlay = { index -> vm.play(playQueue.ifEmpty { popular }, index, contextId) },
                            onToggleLike = { vm.toggleLike(it) },
                            onMore = { actionTrack = it }
                        )
                    } else if (tracks is Async.Loading) {
                        item { SectionHeader("Popular") }
                        item { ListSkeleton() }
                    }

                    if (allTracks.size > 10) {
                        item {
                            ListRow(
                                title = "See all songs",
                                subtitle = "$trackCount tracks",
                                imageUrl = null,
                                icon = Icons.Default.QueueMusic,
                                onClick = { nav.artistTracks(data.id) }
                            )
                        }
                    }

                    if (artistAlbums.isNotEmpty()) {
                        albumRow(
                            title = "Albums",
                            albums = artistAlbums,
                            resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                            onOpen = { nav.album(it.id) }
                        )
                    }

                    data.members?.takeIf { it.isNotEmpty() }?.let { members ->
                        artistRow(
                            title = "Members",
                            artists = members,
                            resolveArtwork = { vm.repo.resolveUrl(it.imageUrl) },
                            onOpen = { nav.artist(it.id) }
                        )
                    }

                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

@Composable
fun ArtistTracksScreen(vm: MusicyViewModel, nav: Nav, artistId: String) {
    val artist by loadAsync("name-$artistId") { vm.repo.artist(artistId) }
    val tracks by loadAsync("all-tracks-$artistId") { vm.repo.artistTracks(artistId) }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }
    val name = artist.valueOrNull?.name ?: "Artist"
    val list = tracks.valueOrNull.orEmpty()
    val contextId = MusicyLibrary.artistId(artistId)

    DetailScaffold(
        titleWhenScrolled = name,
        nav = nav,
        actions = {
            if (list.isNotEmpty()) {
                IconButton(onClick = { vm.shuffle(list, contextId) }) {
                    Icon(Icons.Default.Shuffle, contentDescription = "Shuffle")
                }
            }
        }
    ) { padding ->
        when (val state = tracks) {
            is Async.Loading -> ListSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                LazyColumn(contentPadding = padding) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("All songs", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "${list.size} tracks",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = OnSurfaceVariant
                                )
                            }
                            DownloadAllButton(vm, list)
                            Spacer(Modifier.width(8.dp))
                            FilledTonalButton(onClick = { vm.play(list, 0, contextId) }) {
                                Icon(Icons.Default.QueueMusic, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Play")
                            }
                        }
                    }
                    if (list.isEmpty()) {
                        item { EmptyState("No songs yet", "Nothing published for this artist.") }
                    }
                    trackItems(
                        tracks = list,
                        likedIds = liked,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        numbered = true,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(list, index, contextId) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

// ---------------------------------------------------------------------------
// Playlist
// ---------------------------------------------------------------------------

@Composable
fun PlaylistScreen(vm: MusicyViewModel, nav: Nav, playlistId: String) {
    var reloadKey by remember(playlistId) { mutableIntStateOf(0) }
    val playlist by loadAsync("$playlistId-$reloadKey") { vm.repo.playlist(playlistId) }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    DetailScaffold(titleWhenScrolled = playlist.valueOrNull?.name ?: "Playlist", nav = nav) { padding ->
        when (val state = playlist) {
            is Async.Loading -> DetailSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val data: Playlist = state.value
                val tracks = data.trackList()
                val contextId = MusicyLibrary.playlistId(data.id)
                LazyColumn(contentPadding = padding) {
                    item {
                        DetailHero(
                            title = data.name,
                            subtitle = data.description ?: data.owner?.label?.let { "By $it" } ?: "Playlist",
                            meta = "${tracks.size} tracks",
                            artworkUrl = vm.repo.resolveUrl(data.coverImageUrl ?: tracks.firstOrNull()?.artworkUrl),
                            isPlaying = playback.isPlaying && tracks.any { it.id == playback.currentTrack?.id },
                            onPlay = { vm.play(tracks, 0, contextId) },
                            onShuffle = { vm.shuffle(tracks, contextId) }
                        )
                    }
                    if (tracks.isEmpty()) {
                        item {
                            EmptyState(
                                "This playlist is empty",
                                "Add songs from anywhere using the ⋮ menu.",
                                icon = Icons.Default.QueueMusic
                            )
                        }
                    }
                    trackItems(
                        tracks = tracks,
                        likedIds = liked,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(tracks, index, contextId) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(
        vm = vm,
        nav = nav,
        selected = actionTrack,
        onDismiss = { actionTrack = null },
        onRemoveFromPlaylist = { track ->
            vm.removeFromPlaylist(playlistId, track.id) { reloadKey++ }
        }
    )
}

// ---------------------------------------------------------------------------
// Daily mix
// ---------------------------------------------------------------------------

@Composable
fun DailyMixScreen(vm: MusicyViewModel, nav: Nav, mixId: String) {
    val mix by loadAsync(mixId) { vm.repo.dailyMix(mixId) }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    DetailScaffold(titleWhenScrolled = mix.valueOrNull?.name ?: "Daily Mix", nav = nav) { padding ->
        when (val state = mix) {
            is Async.Loading -> DetailSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val data: DailyMix = state.value
                val tracks = data.tracks.orEmpty()
                val contextId = MusicyLibrary.mixId(data.id)
                LazyColumn(contentPadding = padding) {
                    item {
                        DetailHero(
                            title = data.name,
                            subtitle = data.description ?: "Made for you",
                            meta = "${tracks.size} tracks",
                            artworkUrl = vm.repo.resolveUrl(data.coverImageUrl ?: tracks.firstOrNull()?.artworkUrl),
                            isPlaying = playback.isPlaying && tracks.any { it.id == playback.currentTrack?.id },
                            onPlay = { vm.play(tracks, 0, contextId) },
                            onShuffle = { vm.shuffle(tracks, contextId) },
                            trailing = { DownloadAllButton(vm, tracks) }
                        )
                    }
                    trackItems(
                        tracks = tracks,
                        likedIds = liked,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(tracks, index, contextId) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

// ---------------------------------------------------------------------------
// Genre / category
// ---------------------------------------------------------------------------

@Composable
fun GenreScreen(vm: MusicyViewModel, nav: Nav, genre: String) {
    val tracks by loadAsync("genre-tracks-$genre") { vm.repo.tracks(limit = 100, genre = genre).tracks }
    val albums by loadAsync("genre-albums-$genre") { vm.repo.albums(limit = 30, genre = genre).albums }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    DetailScaffold(titleWhenScrolled = genre, nav = nav) { padding ->
        when (val state = tracks) {
            is Async.Loading -> TrackListSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val list = state.value
                val contextId = MusicyLibrary.genreId(genre)
                LazyColumn(contentPadding = padding) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .padding(horizontal = 16.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(Brush.linearGradient(categoryColors(genre)))
                                .padding(16.dp)
                        ) {
                            Column(modifier = Modifier.align(Alignment.BottomStart)) {
                                Text(genre, style = MaterialTheme.typography.displayMedium, color = Color.White)
                                Text(
                                    "${list.size} tracks",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.White.copy(alpha = 0.85f)
                                )
                            }
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedButton(onClick = { vm.shuffle(list, contextId) }) {
                                Icon(Icons.Default.Shuffle, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Shuffle")
                            }
                            PlayPauseButton(isPlaying = false, onClick = { vm.play(list, 0, contextId) }, size = 48.dp)
                        }
                    }
                    albums.valueOrNull?.takeIf { it.isNotEmpty() }?.let { genreAlbums ->
                        albumRow(
                            title = "Albums in $genre",
                            albums = genreAlbums,
                            resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                            onOpen = { nav.album(it.id) }
                        )
                    }
                    item { SectionHeader("Songs") }
                    trackItems(
                        tracks = list,
                        likedIds = liked,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(list, index, contextId) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

// ---------------------------------------------------------------------------
// Liked songs
// ---------------------------------------------------------------------------

@Composable
fun LikedSongsScreen(vm: MusicyViewModel, nav: Nav) {
    val library by vm.library.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }
    val tracks = library.valueOrNull?.likedSongs.orEmpty()

    DetailScaffold(titleWhenScrolled = "Liked Songs", nav = nav) { padding ->
        LazyColumn(contentPadding = padding) {
            item {
                DetailHero(
                    title = "Liked Songs",
                    subtitle = "Everything you've hearted",
                    meta = "${tracks.size} tracks",
                    artworkUrl = null,
                    accent = LikeRed,
                    isPlaying = playback.isPlaying && tracks.any { it.id == playback.currentTrack?.id },
                    onPlay = { vm.play(tracks, 0, MusicyLibrary.NODE_LIKED) },
                    onShuffle = { vm.shuffle(tracks, MusicyLibrary.NODE_LIKED) },
                    trailing = { DownloadAllButton(vm, tracks) }
                )
            }
            if (library is Async.Loading) item { TrackListSkeleton() }
            if (tracks.isEmpty() && library !is Async.Loading) {
                item {
                    EmptyState(
                        "No liked songs yet",
                        "Tap the heart on any track and it will show up here.",
                        icon = Icons.Default.Favorite
                    )
                }
            }
            trackItems(
                tracks = tracks,
                likedIds = liked,
                currentTrackId = playback.currentTrack?.id,
                isPlaying = playback.isPlaying,
                resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                onPlay = { index -> vm.play(tracks, index, MusicyLibrary.NODE_LIKED) },
                onToggleLike = { vm.toggleLike(it) },
                onMore = { actionTrack = it }
            )
            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

// ---------------------------------------------------------------------------
// "See all" collections
// ---------------------------------------------------------------------------

@Composable
fun CollectionScreen(vm: MusicyViewModel, nav: Nav, kind: String) {
    val title = when (kind) {
        CollectionKind.ALBUMS -> "Albums"
        CollectionKind.ARTISTS -> "Artists"
        CollectionKind.PLAYLISTS -> "Playlists"
        CollectionKind.MIXES -> "Daily Mixes"
        CollectionKind.TRACKS -> "Songs"
        CollectionKind.RECENT -> "Recently played"
        CollectionKind.FOLLOWED -> "Followed artists"
        CollectionKind.NEW_RELEASES -> "New releases"
        CollectionKind.GENRES -> "Browse all"
        else -> "Browse"
    }
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    val content by loadAsync(kind) {
        when (kind) {
            CollectionKind.ALBUMS -> CollectionData(albums = vm.repo.albums(limit = 100).albums)
            CollectionKind.NEW_RELEASES -> CollectionData(albums = vm.repo.feed().newReleases)
            CollectionKind.ARTISTS -> CollectionData(artists = vm.repo.artists(limit = 100).artists)
            CollectionKind.FOLLOWED -> CollectionData(artists = vm.repo.followedArtists(limit = 100))
            CollectionKind.PLAYLISTS -> CollectionData(playlists = vm.repo.playlists(limit = 100))
            CollectionKind.MIXES -> CollectionData(mixes = vm.repo.dailyMixes())
            CollectionKind.TRACKS -> CollectionData(tracks = vm.repo.tracks(limit = 100).tracks)
            CollectionKind.RECENT -> CollectionData(tracks = vm.repo.recentlyPlayed())
            CollectionKind.GENRES -> CollectionData(genres = vm.repo.genres().map { it.name })
            else -> CollectionData()
        }
    }

    DetailScaffold(titleWhenScrolled = title, nav = nav) { padding ->
        when (val state = content) {
            is Async.Loading -> ListSkeleton(modifier = Modifier.padding(padding))
            is Async.Failure -> ErrorBox(state.message, onRetry = nav::back, modifier = Modifier.padding(padding))
            is Async.Success -> {
                val data = state.value
                LazyColumn(contentPadding = padding) {
                    items(data.albums, key = { "album-${it.id}" }) { album ->
                        ListRow(
                            title = album.title,
                            subtitle = listOfNotNull("Album", album.artist?.name, album.year).joinToString(" · "),
                            imageUrl = vm.repo.resolveUrl(album.coverImageUrl),
                            onClick = { nav.album(album.id) }
                        )
                    }
                    items(data.artists, key = { "artist-${it.id}" }) { artist ->
                        ListRow(
                            title = artist.name,
                            subtitle = artist.count?.tracks?.let { "$it tracks" } ?: "Artist",
                            imageUrl = vm.repo.resolveUrl(artist.imageUrl),
                            icon = Icons.Default.Person,
                            circular = true,
                            onClick = { nav.artist(artist.id) }
                        )
                    }
                    items(data.playlists, key = { "playlist-${it.id}" }) { playlist ->
                        ListRow(
                            title = playlist.name,
                            subtitle = "Playlist · ${playlist.trackCount} tracks",
                            imageUrl = vm.repo.resolveUrl(playlist.coverImageUrl),
                            onClick = { nav.playlist(playlist.id) }
                        )
                    }
                    items(data.mixes, key = { "mix-${it.id}" }) { mix ->
                        ListRow(
                            title = mix.name,
                            subtitle = mix.description ?: "${mix.trackCount} tracks",
                            imageUrl = vm.repo.resolveUrl(mix.coverImageUrl),
                            onClick = { nav.mix(mix.id) }
                        )
                    }
                    items(data.genres, key = { "genre-$it" }) { genre ->
                        ListRow(
                            title = genre,
                            subtitle = "Genre",
                            imageUrl = null,
                            onClick = { nav.genre(genre) }
                        )
                    }
                    if (data.tracks.isNotEmpty()) {
                        trackItems(
                            tracks = data.tracks,
                            likedIds = liked,
                            currentTrackId = playback.currentTrack?.id,
                            isPlaying = playback.isPlaying,
                            resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                            onPlay = { index -> vm.play(data.tracks, index) },
                            onToggleLike = { vm.toggleLike(it) },
                            onMore = { actionTrack = it }
                        )
                    }
                    if (data.isEmpty) {
                        item { EmptyState("Nothing here yet", "Come back once there's more in the library.") }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

private data class CollectionData(
    val albums: List<Album> = emptyList(),
    val artists: List<Artist> = emptyList(),
    val playlists: List<Playlist> = emptyList(),
    val mixes: List<DailyMix> = emptyList(),
    val tracks: List<Track> = emptyList(),
    val genres: List<String> = emptyList()
) {
    val isEmpty: Boolean
        get() = albums.isEmpty() && artists.isEmpty() && playlists.isEmpty() &&
            mixes.isEmpty() && tracks.isEmpty() && genres.isEmpty()
}
