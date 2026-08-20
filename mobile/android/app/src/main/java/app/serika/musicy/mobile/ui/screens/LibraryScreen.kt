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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
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

private enum class LibraryTab(val label: String) {
    PLAYLISTS("Playlists"), ARTISTS("Artists"), ALBUMS("Albums"), SONGS("Songs")
}

@Composable
fun LibraryScreen(vm: MusicyViewModel, nav: Nav) {
    val library by vm.library.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    val refreshing by vm.libraryRefreshing.collectAsState()
    var tab by remember { mutableStateOf(LibraryTab.PLAYLISTS) }
    var actionTrack by remember { mutableStateOf<Track?>(null) }
    var showCreate by remember { mutableStateOf(false) }

    val libraryPhase = when (library) {
        is Async.Loading -> 0
        is Async.Failure -> 1
        is Async.Success -> 2
    }
    Crossfade(targetState = libraryPhase, label = "library") { _ ->
    when (val state = library) {
        is Async.Loading -> ListSkeleton()
        is Async.Failure -> ErrorBox(state.message, onRetry = { vm.loadLibrary(force = true) })
        is Async.Success -> {
            val data = state.value
            MusicyPullToRefresh(isRefreshing = refreshing, onRefresh = { vm.refreshLibrary() }) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Your Library", style = MaterialTheme.typography.headlineLarge, modifier = Modifier.weight(1f))
                    IconButton(onClick = { showCreate = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Create playlist")
                    }
                }

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    items(LibraryTab.entries.toList()) { entry ->
                        MusicyChip(entry.label, entry == tab, { tab = entry })
                    }
                }

                LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                    item {
                        Column {
                            PinnedRow(
                                title = "Liked Songs",
                                subtitle = "${data.likedSongs.size} songs",
                                colors = listOf(Primary, Color(0xFFDB2777)),
                                icon = Icons.Default.Favorite,
                                onClick = nav::liked
                            )
                            PinnedRow(
                                title = "Downloads",
                                subtitle = "Available offline",
                                colors = listOf(Color(0xFF059669), Color(0xFF06B6D4)),
                                icon = Icons.Default.Download,
                                onClick = nav::downloads
                            )
                            PinnedRow(
                                title = "Recently played",
                                subtitle = "${data.recentlyPlayed.size} songs",
                                colors = listOf(Color(0xFF4F46E5), Color(0xFF0EA5E9)),
                                icon = Icons.Default.History,
                                onClick = { nav.collection(CollectionKind.RECENT) }
                            )
                            MusicyDivider(Modifier.padding(vertical = 8.dp))
                        }
                    }

                    when (tab) {
                        LibraryTab.PLAYLISTS -> {
                            if (data.playlists.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = "No playlists yet",
                                        message = "Create one and start collecting the songs you love.",
                                        icon = Icons.Default.QueueMusic,
                                        actionLabel = "Create playlist",
                                        onAction = { showCreate = true }
                                    )
                                }
                            }
                            items(data.playlists, key = { it.id }) { playlist ->
                                ListRow(
                                    title = playlist.name,
                                    subtitle = "Playlist · ${playlist.trackCount} tracks",
                                    imageUrl = vm.repo.resolveUrl(playlist.coverImageUrl),
                                    icon = Icons.Default.QueueMusic,
                                    onClick = { nav.playlist(playlist.id) }
                                )
                            }
                        }

                        LibraryTab.ARTISTS -> {
                            if (data.followedArtists.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = "You're not following anyone",
                                        message = "Follow artists to see their new releases here.",
                                        icon = Icons.Default.Person
                                    )
                                }
                            } else {
                                artistGrid(
                                    title = "",
                                    artists = data.followedArtists,
                                    resolveArtwork = { vm.repo.resolveUrl(it.imageUrl) },
                                    onOpen = { nav.artist(it.id) },
                                    maxItems = 99
                                )
                            }
                        }

                        LibraryTab.ALBUMS -> {
                            if (data.albums.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = "No albums here yet",
                                        message = "Albums you play will show up in your library.",
                                        icon = Icons.Default.QueueMusic
                                    )
                                }
                            } else {
                                albumGrid(
                                    title = "",
                                    albums = data.albums,
                                    resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                                    onOpen = { nav.album(it.id) },
                                    maxItems = 60
                                )
                            }
                        }

                        LibraryTab.SONGS -> {
                            if (data.likedSongs.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = "No liked songs",
                                        message = "Tap the heart on any track to save it here.",
                                        icon = Icons.Default.Favorite
                                    )
                                }
                            }
                            trackItems(
                                tracks = data.likedSongs,
                                likedIds = liked,
                                currentTrackId = playback.currentTrack?.id,
                                isPlaying = playback.isPlaying,
                                resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                                onPlay = { index -> vm.play(data.likedSongs, index, MusicyLibrary.NODE_LIKED) },
                                onToggleLike = { vm.toggleLike(it) },
                                onMore = { actionTrack = it }
                            )
                        }
                    }
                }
            }
            }
        }
    }
    }

    if (showCreate) {
        CreatePlaylistDialog(
            onDismiss = { showCreate = false },
            onCreate = { name ->
                vm.createPlaylist(name)
                showCreate = false
            }
        )
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

@Composable
private fun PinnedRow(
    title: String,
    subtitle: String,
    colors: List<Color>,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Brush.linearGradient(colors)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
        }
    }
}

@Composable
internal fun ListRow(
    title: String,
    subtitle: String,
    imageUrl: String?,
    onClick: () -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector = Icons.Default.QueueMusic,
    circular: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Artwork(
            url = imageUrl,
            contentDescription = title,
            icon = icon,
            shape = if (circular) androidx.compose.foundation.shape.CircleShape else RoundedCornerShape(8.dp),
            modifier = Modifier.size(52.dp)
        )
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun CreatePlaylistDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New playlist") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                placeholder = { Text("Playlist name") },
                singleLine = true
            )
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onCreate(name.trim()) }, enabled = name.isNotBlank()) {
                Text("Create")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        containerColor = SurfaceVariant
    )
}
