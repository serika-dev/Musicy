package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.*
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import kotlinx.coroutines.launch

/**
 * The offline library. Downloaded files play straight from disk, so this is
 * the one screen that keeps working with no connection at all.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsScreen(vm: MusicyViewModel, nav: Nav) {
    val downloads by vm.repo.downloads.collectAsState(initial = emptyList())
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    var actionTrack by remember { mutableStateOf<Track?>(null) }
    val scope = rememberCoroutineScope()

    val tracks = downloads.map { it.track }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Downloads") },
                navigationIcon = { BackButton(nav::back) },
                actions = {
                    if (downloads.isNotEmpty()) {
                        TextButton(onClick = { scope.launch { vm.repo.clearDownloads() } }) {
                            Text("Clear all")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { padding ->
        if (downloads.isEmpty()) {
            EmptyState(
                title = "Nothing downloaded yet",
                message = "Open a track's ⋮ menu or the download button in the player to save it for offline listening.",
                icon = Icons.Default.Download,
                modifier = Modifier.padding(padding)
            )
            return@Scaffold
        }

        LazyColumn(contentPadding = padding) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${downloads.size} tracks", style = MaterialTheme.typography.titleMedium)
                        Text(
                            formatBytes(downloads.sumOf { it.sizeBytes }) + " on this device",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    FilledTonalButton(onClick = { vm.play(tracks, 0) }) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Play all")
                    }
                }
            }

            items(downloads.size, key = { downloads[it].track.id }) { index ->
                val entry = downloads[index]
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    TrackRow(
                        track = entry.track,
                        artworkUrl = vm.repo.resolveUrl(entry.track.artworkUrl),
                        isCurrent = entry.track.id == playback.currentTrack?.id,
                        isPlaying = playback.isPlaying,
                        isLiked = entry.track.id in liked,
                        onClick = { vm.play(tracks, index) },
                        onToggleLike = { vm.toggleLike(entry.track) },
                        onMore = { actionTrack = entry.track },
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = { scope.launch { vm.repo.removeDownload(entry.track.id) } }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete download",
                            tint = OnSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}
