package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.Async
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import java.util.Calendar

@Composable
fun HomeScreen(vm: MusicyViewModel, nav: Nav, userName: String) {
    val home by vm.home.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.playback.collectAsState()
    val refreshing by vm.homeRefreshing.collectAsState()
    val continueQueue by vm.continueQueue.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    // Crossfade on the load phase, not on the value, so a pull-refresh (which
    // keeps the phase at Success) updates in place without resetting scroll,
    // while the first skeleton→content swap fades smoothly.
    val homePhase = when (home) {
        is Async.Loading -> 0
        is Async.Failure -> 1
        is Async.Success -> 2
    }
    Crossfade(targetState = homePhase, label = "home") { _ ->
    when (val state = home) {
        is Async.Loading -> HomeSkeleton()
        is Async.Failure -> ErrorBox(state.message, onRetry = { vm.loadHome(force = true) })
        is Async.Success -> {
            val data = state.value
            val feed = data.feed
            val recommended = feed?.recommendedTracks.orEmpty()
            val chrome = rememberTrackListChrome(vm, recommended.take(8))

            MusicyPullToRefresh(isRefreshing = refreshing, onRefresh = { vm.refreshHome() }) {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                        Text(greeting(), style = MaterialTheme.typography.displayMedium)
                        Text(
                            "Welcome back, $userName",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceVariant
                        )
                    }
                }

                continueQueue?.takeIf { it.isUsable && playback.currentTrack == null }?.let { saved ->
                    item {
                        ContinueListeningCard(
                            track = saved.tracks.getOrNull(saved.index) ?: saved.tracks.first(),
                            coverUrl = vm.repo.resolveUrl(
                                saved.tracks.getOrNull(saved.index)?.artworkUrl
                                    ?: saved.tracks.first().artworkUrl
                            ),
                            remaining = saved.tracks.size,
                            onResume = { vm.resumeContinueListening() }
                        )
                    }
                }

                item {
                    QuickAccessGrid(
                        onLiked = nav::liked,
                        onDownloads = nav::downloads,
                        onRecent = { nav.collection(CollectionKind.RECENT) },
                        onPlaylists = { nav.collection(CollectionKind.PLAYLISTS) }
                    )
                }

                feed?.featuredAlbum?.let { album ->
                    item {
                        FeaturedAlbum(
                            album = album,
                            coverUrl = vm.repo.resolveUrl(album.coverImageUrl),
                            onOpen = { nav.album(album.id) },
                            onPlay = {
                                vm.play(
                                    album.tracks.orEmpty(),
                                    contextId = MusicyLibrary.albumId(album.id)
                                )
                            }
                        )
                    }
                }

                if (data.genres.isNotEmpty()) {
                    item {
                        SectionHeader(
                            "Browse categories",
                            actionLabel = "All",
                            onAction = { nav.collection(CollectionKind.GENRES) }
                        )
                    }
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(data.genres, key = { it.name }) { genre ->
                                CategoryTile(
                                    name = genre.name,
                                    count = genre.count,
                                    onClick = { nav.genre(genre.name) }
                                )
                            }
                        }
                    }
                }

                if (data.dailyMixes.isNotEmpty()) {
                    mixRow(
                        title = "Made for you",
                        subtitle = "Daily mixes built from what you play",
                        mixes = data.dailyMixes,
                        resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl ?: it.tracks?.firstOrNull()?.artworkUrl) },
                        onOpen = { nav.mix(it.id) },
                        onPlay = { vm.playMix(it) },
                        onSeeAll = { nav.collection(CollectionKind.MIXES) }
                    )
                }

                if (recommended.isNotEmpty()) {
                    item { SectionHeader("Recommended for you", subtitle = "Based on your listening") }
                    trackItems(
                        tracks = recommended.take(8),
                        likedIds = liked,
                        chrome = chrome,
                        currentTrackId = playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(recommended.take(8), index) },
                        onToggleLike = { vm.toggleLike(it) },
                        onMore = { actionTrack = it }
                    )
                }

                val recentlyPlayed = feed?.recentlyPlayed.orEmpty()
                if (recentlyPlayed.isNotEmpty()) {
                    trackRow(
                        title = "Jump back in",
                        tracks = recentlyPlayed,
                        resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                        onPlay = { index -> vm.play(recentlyPlayed, index) },
                        onSeeAll = { nav.collection(CollectionKind.RECENT) }
                    )
                }

                val newReleases = feed?.newReleases.orEmpty().ifEmpty { data.albums }
                if (newReleases.isNotEmpty()) {
                    albumGrid(
                        title = "New releases",
                        albums = newReleases,
                        resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                        onOpen = { nav.album(it.id) },
                        onSeeAll = { nav.collection(CollectionKind.NEW_RELEASES) },
                        maxItems = 6
                    )
                }

                val followedAlbums = feed?.followedAlbums.orEmpty()
                if (followedAlbums.isNotEmpty()) {
                    albumRow(
                        title = "From artists you follow",
                        albums = followedAlbums,
                        resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                        onOpen = { nav.album(it.id) }
                    )
                }

                val topArtists = feed?.topArtists.orEmpty().ifEmpty { data.artists }
                if (topArtists.isNotEmpty()) {
                    artistRow(
                        title = "Your top artists",
                        artists = topArtists,
                        resolveArtwork = { vm.repo.resolveUrl(it.imageUrl) },
                        onOpen = { nav.artist(it.id) },
                        onSeeAll = { nav.collection(CollectionKind.ARTISTS) }
                    )
                }

                val discover = feed?.discoverAlbums.orEmpty()
                if (discover.isNotEmpty()) {
                    albumRow(
                        title = "Discover",
                        subtitle = "Albums in genres you like",
                        albums = discover,
                        resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                        onOpen = { nav.album(it.id) }
                    )
                }

                val recommendedArtists = feed?.recommendedArtists.orEmpty()
                if (recommendedArtists.isNotEmpty()) {
                    artistRow(
                        title = "Artists you might like",
                        artists = recommendedArtists,
                        resolveArtwork = { vm.repo.resolveUrl(it.imageUrl) },
                        onOpen = { nav.artist(it.id) }
                    )
                }

                if (data.playlists.isNotEmpty()) {
                    playlistRow(
                        title = "Featured playlists",
                        playlists = data.playlists,
                        resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                        onOpen = { nav.playlist(it.id) },
                        onSeeAll = { nav.collection(CollectionKind.PLAYLISTS) }
                    )
                }
            }
            }
        }
    }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

private fun greeting(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Good morning"
    in 12..17 -> "Good afternoon"
    in 18..21 -> "Good evening"
    else -> "Late night listening"
}

@Composable
private fun ContinueListeningCard(
    track: Track,
    coverUrl: String?,
    remaining: Int,
    onResume: () -> Unit
) {
    Row(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceVariant)
            .clickable(onClick = onResume)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Artwork(url = coverUrl, contentDescription = track.title, modifier = Modifier.size(56.dp), shape = RoundedCornerShape(10.dp))
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text("Continue listening", style = MaterialTheme.typography.labelMedium, color = Primary)
            Text(track.title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                "${track.artistLine} · $remaining in queue",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        PlayPauseButton(isPlaying = false, onClick = onResume, size = 44.dp)
    }
}

@Composable
private fun QuickAccessGrid(
    onLiked: () -> Unit,
    onDownloads: () -> Unit,
    onRecent: () -> Unit,
    onPlaylists: () -> Unit
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            QuickTile("Liked Songs", Icons.Default.Favorite, Modifier.weight(1f), onLiked)
            QuickTile("Downloads", Icons.Default.Download, Modifier.weight(1f), onDownloads)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            QuickTile("Recently played", Icons.Default.History, Modifier.weight(1f), onRecent)
            QuickTile("Playlists", Icons.Default.QueueMusic, Modifier.weight(1f), onPlaylists)
        }
    }
}

@Composable
private fun QuickTile(label: String, icon: ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(SurfaceVariant)
            .clickable(onClick = onClick)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Brush.linearGradient(listOf(Primary, Primary.copy(alpha = 0.6f)))),
            contentAlignment = Alignment.Center
        ) {
            androidx.compose.material3.Icon(
                icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(18.dp)
            )
        }
        Spacer(Modifier.width(10.dp))
        Text(
            label,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun FeaturedAlbum(album: Album, coverUrl: String?, onOpen: () -> Unit, onPlay: () -> Unit) {
    Box(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .height(190.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onOpen)
    ) {
        Artwork(url = coverUrl, contentDescription = album.title, modifier = Modifier.fillMaxSize(), shape = RoundedCornerShape(16.dp))
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                "FEATURED",
                style = MaterialTheme.typography.labelSmall,
                color = Primary
            )
            Spacer(Modifier.height(4.dp))
            Text(
                album.title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                album.artist?.name.orEmpty(),
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.75f)
            )
        }
        PlayPauseButton(
            isPlaying = false,
            onClick = onPlay,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            size = 52.dp
        )
    }
}

@Composable
private fun CategoryTile(name: String, count: Int, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(width = 150.dp, height = 84.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Brush.linearGradient(categoryColors(name)))
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        Column(modifier = Modifier.align(Alignment.BottomStart)) {
            Text(
                name,
                style = MaterialTheme.typography.titleSmall,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "$count tracks",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.8f)
            )
        }
    }
}

/** Genres get a stable colour from their name, so the grid looks intentional. */
internal fun categoryColors(name: String): List<Color> {
    val palettes = listOf(
        listOf(Color(0xFF7C3AED), Color(0xFFA855F7)),
        listOf(Color(0xFF0EA5E9), Color(0xFF6366F1)),
        listOf(Color(0xFFDB2777), Color(0xFF9333EA)),
        listOf(Color(0xFF059669), Color(0xFF14B8A6)),
        listOf(Color(0xFFEA580C), Color(0xFFF59E0B)),
        listOf(Color(0xFF4F46E5), Color(0xFF06B6D4))
    )
    val index = (name.hashCode().toLong() and 0xFFFFFFFFL).mod(palettes.size.toLong()).toInt()
    return palettes[index]
}

// -- reusable carousels ------------------------------------------------------

internal fun androidx.compose.foundation.lazy.LazyListScope.albumGrid(
    title: String,
    albums: List<Album>,
    resolveArtwork: (Album) -> String?,
    onOpen: (Album) -> Unit,
    onSeeAll: (() -> Unit)? = null,
    maxItems: Int = 8
) {
    if (albums.isEmpty()) return
    if (title.isNotBlank()) {
        item { SectionHeader(title, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    }
    val shown = albums.take(maxItems)
    shown.chunked(2).forEachIndexed { rowIndex, row ->
        item(key = "album-grid-$title-$rowIndex") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                row.forEach { album ->
                    GridCover(
                        title = album.title,
                        subtitle = listOfNotNull(album.year, album.albumType?.takeIf { it != "ALBUM" }?.lowercase()?.replaceFirstChar { it.uppercase() }).joinToString(" · ").ifBlank { album.artist?.name },
                        imageUrl = resolveArtwork(album),
                        onClick = { onOpen(album) },
                        modifier = Modifier.weight(1f)
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.artistGrid(
    title: String,
    artists: List<Artist>,
    resolveArtwork: (Artist) -> String?,
    onOpen: (Artist) -> Unit,
    onSeeAll: (() -> Unit)? = null,
    maxItems: Int = 9
) {
    if (artists.isEmpty()) return
    if (title.isNotBlank()) {
        item { SectionHeader(title, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    }
    val shown = artists.take(maxItems)
    shown.chunked(3).forEachIndexed { rowIndex, row ->
        item(key = "artist-grid-$title-$rowIndex") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                row.forEach { artist ->
                    GridCover(
                        title = artist.name,
                        subtitle = artist.count?.tracks?.let { "$it tracks" },
                        imageUrl = resolveArtwork(artist),
                        circular = true,
                        icon = Icons.Default.Person,
                        onClick = { onOpen(artist) },
                        modifier = Modifier.weight(1f)
                    )
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.albumRow(
    title: String,
    albums: List<Album>,
    resolveArtwork: (Album) -> String?,
    onOpen: (Album) -> Unit,
    subtitle: String? = null,
    onSeeAll: (() -> Unit)? = null
) {
    item { SectionHeader(title, subtitle = subtitle, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    item {
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp)) {
            items(albums, key = { it.id }) { album ->
                MediaCard(
                    title = album.title,
                    subtitle = album.artist?.name,
                    imageUrl = resolveArtwork(album),
                    onClick = { onOpen(album) }
                )
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.artistRow(
    title: String,
    artists: List<Artist>,
    resolveArtwork: (Artist) -> String?,
    onOpen: (Artist) -> Unit,
    onSeeAll: (() -> Unit)? = null
) {
    item { SectionHeader(title, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    item {
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp)) {
            items(artists, key = { it.id }) { artist ->
                MediaCard(
                    title = artist.name,
                    subtitle = artist.count?.tracks?.let { "$it tracks" } ?: "Artist",
                    imageUrl = resolveArtwork(artist),
                    circular = true,
                    icon = Icons.Default.Person,
                    onClick = { onOpen(artist) }
                )
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.playlistRow(
    title: String,
    playlists: List<Playlist>,
    resolveArtwork: (Playlist) -> String?,
    onOpen: (Playlist) -> Unit,
    onSeeAll: (() -> Unit)? = null
) {
    item { SectionHeader(title, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    item {
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp)) {
            items(playlists, key = { it.id }) { playlist ->
                MediaCard(
                    title = playlist.name,
                    subtitle = "${playlist.trackCount} tracks",
                    imageUrl = resolveArtwork(playlist),
                    icon = Icons.Default.QueueMusic,
                    onClick = { onOpen(playlist) }
                )
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.mixRow(
    title: String,
    mixes: List<DailyMix>,
    resolveArtwork: (DailyMix) -> String?,
    onOpen: (DailyMix) -> Unit,
    onPlay: (DailyMix) -> Unit,
    subtitle: String? = null,
    onSeeAll: (() -> Unit)? = null
) {
    item { SectionHeader(title, subtitle = subtitle, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    item {
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp)) {
            items(mixes, key = { it.id }) { mix ->
                MediaCard(
                    title = mix.name,
                    subtitle = mix.description ?: "${mix.trackCount} tracks",
                    imageUrl = resolveArtwork(mix),
                    width = 164.dp,
                    onClick = { onOpen(mix) },
                    onPlay = { onPlay(mix) }
                )
            }
        }
    }
}

internal fun androidx.compose.foundation.lazy.LazyListScope.trackRow(
    title: String,
    tracks: List<Track>,
    resolveArtwork: (Track) -> String?,
    onPlay: (Int) -> Unit,
    onSeeAll: (() -> Unit)? = null
) {
    item { SectionHeader(title, actionLabel = onSeeAll?.let { "View all" }, onAction = onSeeAll) }
    item {
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp)) {
            items(tracks.size, key = { "${it}_${tracks[it].id}" }) { index ->
                val track = tracks[index]
                MediaCard(
                    title = track.title,
                    subtitle = track.artistLine,
                    imageUrl = resolveArtwork(track),
                    width = 132.dp,
                    onClick = { onPlay(index) }
                )
            }
        }
    }
}
