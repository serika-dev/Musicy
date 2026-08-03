package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Lyrics
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Replay10
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.player.RepeatMode
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.*
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Outline
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PlayerScreen(vm: MusicyViewModel, nav: Nav) {
    val state by vm.player.state.collectAsState()
    // Position lives in its own flow so the scrubber and lyrics can tick
    // without dragging the rest of the screen through a recomposition.
    val position by vm.player.position.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val settings by vm.settings.collectAsState()
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
    val haptics = settings.hapticFeedback

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
    val remote = vm.isRemoteControlling

    val onTogglePlay = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause()
    }
    val onNext = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("next") else vm.player.next()
    }
    val onPrevious = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("previous") else vm.player.previous()
    }
    val onShuffle = rememberHapticClick(haptics) { vm.player.toggleShuffle() }
    val onRepeat = rememberHapticClick(haptics) { vm.player.cycleRepeat() }
    val onRewind = rememberHapticClick(haptics) { vm.player.seekBy(-settings.seekStepSeconds) }
    val onForward = rememberHapticClick(haptics) { vm.player.seekBy(settings.seekStepSeconds) }

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
                    text = if (remote) {
                        devices.firstOrNull { it.id == activeDeviceId }?.name ?: "Another device"
                    } else {
                        "This device"
                    },
                    style = MaterialTheme.typography.labelMedium,
                    color = if (remote) Primary else OnSurfaceVariant,
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
            IconButton(onClick = rememberHapticClick(haptics) { vm.toggleLike(track) }) {
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

        // While the thumb is held the local value wins, so the bar doesn't
        // fight the player's own position updates.
        val sliderValue = scrubPosition ?: position.progress
        Slider(
            value = sliderValue,
            onValueChange = { scrubPosition = it },
            onValueChangeFinished = {
                scrubPosition?.let { fraction ->
                    val target = (position.durationMs * fraction).toLong()
                    if (remote) vm.sendRemoteCommand("seek", target / 1000.0) else vm.player.seekTo(target)
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
                formatDurationMs((position.durationMs * sliderValue).toLong()),
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant
            )
            Text(
                formatDurationMs(position.durationMs),
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
            IconButton(onClick = onShuffle) {
                Icon(
                    Icons.Default.Shuffle,
                    contentDescription = "Shuffle",
                    tint = if (state.shuffle) Primary else OnSurfaceVariant
                )
            }
            IconButton(onClick = onPrevious) {
                Icon(Icons.Default.SkipPrevious, contentDescription = "Previous track", modifier = Modifier.size(34.dp))
            }
            PlayPauseButton(isPlaying = state.isPlaying, onClick = onTogglePlay, size = 68.dp)
            IconButton(enabled = state.hasNext || remote, onClick = onNext) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next track", modifier = Modifier.size(34.dp))
            }
            IconButton(onClick = onRepeat) {
                Icon(
                    imageVector = if (state.repeatMode == RepeatMode.ONE) Icons.Default.RepeatOne else Icons.Default.Repeat,
                    contentDescription = "Repeat mode",
                    tint = if (state.repeatMode == RepeatMode.OFF) OnSurfaceVariant else Primary
                )
            }
        }

        if (!remote) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onRewind) {
                    Icon(Icons.Default.Replay10, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${settings.seekStepSeconds}s")
                }
                Spacer(Modifier.width(24.dp))
                TextButton(onClick = onForward) {
                    Text("${settings.seekStepSeconds}s")
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Default.Forward10, contentDescription = null, modifier = Modifier.size(20.dp))
                }
            }
        }

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
            LyricsPanel(
                vm = vm,
                track = track,
                positionMs = position.positionMs,
                onSeek = { target ->
                    if (remote) vm.sendRemoteCommand("seek", target / 1000.0) else vm.player.seekTo(target)
                }
            )
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
