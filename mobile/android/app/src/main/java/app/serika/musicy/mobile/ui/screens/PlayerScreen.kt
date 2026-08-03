package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Lyrics
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RepeatOne
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.player.RepeatMode
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.*
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Outline
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** One line of an LRC file. */
private data class LyricLine(val timeMs: Long, val text: String)

@Composable
fun PlayerScreen(vm: MusicyViewModel, nav: Nav) {
    val state by vm.player.state.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val devices by vm.syncDevices.collectAsState()
    val activeDeviceId by vm.syncActiveDeviceId.collectAsState()
    val thisDeviceId by vm.thisDeviceId.collectAsState()
    val syncConnected by vm.syncConnected.collectAsState()

    var showQueue by remember { mutableStateOf(false) }
    var showDevices by remember { mutableStateOf(false) }
    var showLyrics by remember { mutableStateOf(false) }
    var scrubPosition by remember { mutableStateOf<Float?>(null) }
    var downloading by remember { mutableStateOf(false) }

    val track = state.currentTrack
    val scope = rememberCoroutineScope()

    if (track == null) {
        EmptyState(
            title = "Nothing playing",
            message = "Pick a song, album or mix and it will show up here.",
            icon = Icons.Default.QueueMusic,
            modifier = Modifier.fillMaxSize().wrapContentHeight()
        )
        return
    }

    val isDownloaded = remember(track.id, downloading) { vm.repo.isDownloaded(track.id) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Primary.copy(alpha = 0.30f), MaterialTheme.colorScheme.background)
                )
            )
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = nav::back) {
                Icon(Icons.Default.ExpandMore, contentDescription = "Close player")
            }
            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("NOW PLAYING", style = MaterialTheme.typography.labelSmall, color = OnSurfaceVariant)
                Text(
                    text = when {
                        vm.isRemoteControlling -> devices.firstOrNull { it.id == activeDeviceId }?.name ?: "Another device"
                        else -> "This device"
                    },
                    style = MaterialTheme.typography.labelMedium,
                    color = if (vm.isRemoteControlling) Primary else OnSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = { showDevices = true }) {
                Icon(
                    Icons.Default.Cast,
                    contentDescription = "Connect to a device",
                    tint = if (syncConnected) Primary else OnSurfaceVariant
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        Artwork(
            url = vm.repo.resolveUrl(track.artworkUrl),
            contentDescription = track.title,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
        )

        Spacer(Modifier.height(24.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    track.title,
                    style = MaterialTheme.typography.headlineMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    track.artistLine,
                    style = MaterialTheme.typography.bodyLarge,
                    color = OnSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = { vm.toggleLike(track) }) {
                Icon(
                    imageVector = if (track.id in liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = if (track.id in liked) "Remove from Liked Songs" else "Add to Liked Songs",
                    tint = if (track.id in liked) LikeRed else OnSurfaceVariant
                )
            }
            IconButton(
                enabled = !downloading && !isDownloaded,
                onClick = {
                    downloading = true
                    scope.launch {
                        val result = withContext(Dispatchers.IO) { vm.repo.download(track) }
                        downloading = false
                        vm.showToast(if (result.isSuccess) "Saved for offline" else "Download failed")
                    }
                }
            ) {
                if (downloading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Primary)
                } else {
                    Icon(
                        imageVector = if (isDownloaded) Icons.Default.DownloadDone else Icons.Default.Download,
                        contentDescription = if (isDownloaded) "Downloaded" else "Download for offline",
                        tint = if (isDownloaded) Primary else OnSurfaceVariant
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Seek bar. While the thumb is held, the local value wins so the bar
        // doesn't fight the player's position updates.
        val sliderValue = scrubPosition ?: state.progress
        Slider(
            value = sliderValue,
            onValueChange = { scrubPosition = it },
            onValueChangeFinished = {
                scrubPosition?.let { fraction ->
                    val target = (state.durationMs * fraction).toLong()
                    if (vm.isRemoteControlling) {
                        vm.sendRemoteCommand("seek", target / 1000.0)
                    } else {
                        vm.player.seekTo(target)
                    }
                }
                scrubPosition = null
            },
            colors = SliderDefaults.colors(
                thumbColor = Primary,
                activeTrackColor = Primary,
                inactiveTrackColor = Outline
            )
        )
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                formatDurationMs((state.durationMs * sliderValue).toLong()),
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant
            )
            Text(
                formatDurationMs(state.durationMs),
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant
            )
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { vm.player.toggleShuffle() }) {
                Icon(
                    Icons.Default.Shuffle,
                    contentDescription = "Shuffle",
                    tint = if (state.shuffle) Primary else OnSurfaceVariant
                )
            }
            IconButton(
                onClick = { if (vm.isRemoteControlling) vm.sendRemoteCommand("previous") else vm.player.previous() }
            ) {
                Icon(Icons.Default.SkipPrevious, contentDescription = "Previous track", modifier = Modifier.size(34.dp))
            }
            PlayPauseButton(
                isPlaying = state.isPlaying,
                onClick = { if (vm.isRemoteControlling) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause() },
                size = 68.dp
            )
            IconButton(
                enabled = state.hasNext || vm.isRemoteControlling,
                onClick = { if (vm.isRemoteControlling) vm.sendRemoteCommand("next") else vm.player.next() }
            ) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next track", modifier = Modifier.size(34.dp))
            }
            IconButton(onClick = { vm.player.cycleRepeat() }) {
                Icon(
                    imageVector = if (state.repeatMode == RepeatMode.ONE) Icons.Default.RepeatOne else Icons.Default.Repeat,
                    contentDescription = "Repeat mode",
                    tint = if (state.repeatMode == RepeatMode.OFF) OnSurfaceVariant else Primary
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TextButton(onClick = { showLyrics = !showLyrics }) {
                Icon(Icons.Default.Lyrics, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(if (showLyrics) "Hide lyrics" else "Lyrics")
            }
            TextButton(onClick = { showQueue = true }) {
                Icon(Icons.Default.QueueMusic, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Queue · ${state.queue.size}")
            }
        }

        AnimatedVisibility(visible = showLyrics) {
            LyricsPanel(vm = vm, track = track, positionMs = state.positionMs)
        }

        Spacer(Modifier.height(32.dp))
    }

    if (showQueue) {
        QueueSheet(
            queue = state.queue,
            currentIndex = state.currentIndex,
            resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
            onDismiss = { showQueue = false },
            onSkipTo = { vm.player.skipTo(it) },
            onRemove = { vm.player.removeFromQueue(it) }
        )
    }

    if (showDevices) {
        DeviceSheet(
            devices = devices,
            thisDeviceId = thisDeviceId,
            activeDeviceId = activeDeviceId,
            connected = syncConnected,
            onDismiss = { showDevices = false },
            onPlayHere = { vm.claimPlaybackHere() },
            onTransfer = { vm.transferPlaybackTo(it) }
        )
    }
}

/**
 * Synced lyrics when the server has them, plain text otherwise — the same
 * LRCLib data the web player renders.
 */
@Composable
private fun LyricsPanel(vm: MusicyViewModel, track: Track, positionMs: Long) {
    val lyrics by loadAsync(track.id) { vm.repo.lyrics(track.id) }
    val settings by vm.settings.collectAsState()

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
        val data = lyrics.valueOrNull
        when {
            lyrics is app.serika.musicy.mobile.ui.viewmodel.Async.Loading ->
                CircularProgressIndicator(color = Primary, modifier = Modifier.padding(16.dp))

            data == null || !data.hasAnything ->
                Text(
                    "No lyrics found for this track.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(vertical = 12.dp)
                )

            settings.preferSyncedLyrics && !data.syncedLyrics.isNullOrBlank() ->
                SyncedLyrics(parseLrc(data.syncedLyrics), positionMs)

            else -> Text(
                data.plainLyrics ?: data.syncedLyrics.orEmpty(),
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun SyncedLyrics(lines: List<LyricLine>, positionMs: Long) {
    if (lines.isEmpty()) return
    val activeIndex = remember(positionMs, lines) {
        lines.indexOfLast { it.timeMs <= positionMs }.coerceAtLeast(0)
    }
    val listState = rememberLazyListState()

    LaunchedEffect(activeIndex) {
        // A beat of delay keeps the scroll from fighting a user drag.
        delay(80)
        listState.animateScrollToItem(activeIndex.coerceAtLeast(0))
    }

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        items(lines.size) { index ->
            val active = index == activeIndex
            Text(
                text = lines[index].text.ifBlank { "♪" },
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                color = if (active) Color.White else OnSurfaceVariant.copy(alpha = 0.6f),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
            )
        }
    }
}

/** Parses `[mm:ss.xx] text` lines out of an LRC payload. */
private fun parseLrc(raw: String?): List<LyricLine> {
    if (raw.isNullOrBlank()) return emptyList()
    val pattern = Regex("""\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]""")
    return raw.lineSequence().mapNotNull { line ->
        val match = pattern.find(line) ?: return@mapNotNull null
        val minutes = match.groupValues[1].toLongOrNull() ?: return@mapNotNull null
        val seconds = match.groupValues[2].toLongOrNull() ?: return@mapNotNull null
        val fraction = match.groupValues[3]
        val millis = when (fraction.length) {
            0 -> 0L
            1 -> fraction.toLong() * 100
            2 -> fraction.toLong() * 10
            else -> fraction.toLong()
        }
        LyricLine(
            timeMs = minutes * 60_000 + seconds * 1_000 + millis,
            text = line.substring(match.range.last + 1).trim()
        )
    }.sortedBy { it.timeMs }.toList()
}
