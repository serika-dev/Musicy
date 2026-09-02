package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Lyrics
import androidx.compose.material.icons.filled.MoreVert
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.player.RepeatMode
import app.serika.musicy.mobile.player.SleepTimerState
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
import kotlin.math.abs
import kotlin.math.roundToInt

/** Distance a drag on the artwork has to cover to count, in pixels. */
private const val ARTWORK_SWIPE_THRESHOLD = 120f

@Composable
fun PlayerScreen(vm: MusicyViewModel, nav: Nav) {
    val state by vm.playback.collectAsState()
    // Position lives in its own flow so the scrubber and lyrics can tick
    // without dragging the rest of the screen through a recomposition.
    val position by vm.position.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val settings by vm.settings.collectAsState()
    val devices by vm.syncDevices.collectAsState()
    val activeDeviceId by vm.syncActiveDeviceId.collectAsState()
    val thisDeviceId by vm.thisDeviceId.collectAsState()
    val syncConnected by vm.syncConnected.collectAsState()
    val sleepRemaining by SleepTimerState.remainingMs.collectAsState()
    val sleepEndOfTrack by SleepTimerState.endOfTrack.collectAsState()
    val library by vm.library.collectAsState()

    var showQueue by remember { mutableStateOf(false) }
    var showDevices by remember { mutableStateOf(false) }
    var lyricsFullscreen by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showSleep by remember { mutableStateOf(false) }
    var showTune by remember { mutableStateOf(false) }
    var showPlaylistPicker by remember { mutableStateOf(false) }
    var scrubPosition by remember { mutableStateOf<Float?>(null) }
    val downloadedIds by vm.downloadedIds.collectAsState()
    val downloadingIds by vm.downloadingIds.collectAsState()

    val track = state.currentTrack
    val haptics = settings.hapticFeedback
    val animate = !settings.reducedMotion

    if (track == null) {
        EmptyState(
            title = "Nothing playing",
            message = "Pick a song, album or mix and it will show up here.",
            icon = Icons.Default.QueueMusic,
            modifier = Modifier.fillMaxSize().wrapContentHeight()
        )
        return
    }

    val isDownloaded = track.id in downloadedIds
    val downloading = track.id in downloadingIds
    val remote = vm.isRemoteControlling
    val artworkUrl = vm.repo.resolveUrl(track.artworkUrl)
    // The whole screen takes its colour from the cover, the way the web
    // player's now-playing view does.
    val accent by rememberArtworkColor(artworkUrl, fallback = Primary)

    // The big-player lyrics view takes over the whole screen, so it is its own
    // layout rather than a section wedged into this one.
    if (lyricsFullscreen) {
        FullscreenLyrics(vm = vm, onClose = { lyricsFullscreen = false })
        return
    }

    val onTogglePlay = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause()
    }
    val onNext = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("next") else vm.player.next()
    }
    val onPrevious = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("previous") else vm.player.previous()
    }
    val onShuffle = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("shuffle") else vm.player.toggleShuffle()
    }
    val onRepeat = rememberHapticClick(haptics) {
        if (remote) {
            val next = when (state.repeatMode) {
                RepeatMode.OFF -> "playlist"
                RepeatMode.ALL -> "track"
                RepeatMode.ONE -> "off"
            }
            vm.sendRemoteCommand("setRepeat", mode = next)
        } else vm.player.cycleRepeat()
    }
    val onRewind = rememberHapticClick(haptics) { vm.player.seekBy(-settings.seekStepSeconds) }
    val onForward = rememberHapticClick(haptics) { vm.player.seekBy(settings.seekStepSeconds) }

    // Artwork drag: sideways changes track, downwards dismisses the player.
    var dragX by remember { mutableFloatStateOf(0f) }
    var dragY by remember { mutableFloatStateOf(0f) }
    val artOffset by animateFloatAsState(targetValue = dragX / 2.5f, label = "artworkDrag")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        accent.copy(alpha = 0.75f),
                        accent.copy(alpha = 0.25f),
                        MaterialTheme.colorScheme.background
                    )
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
            IconButton(onClick = { showMenu = true }) {
                Icon(Icons.Default.MoreVert, contentDescription = "More options")
            }
        }

        Spacer(Modifier.height(12.dp))

        Artwork(
            url = artworkUrl,
            contentDescription = track.title,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .nudge(artOffset)
                .pointerInput(track.id, remote) {
                    detectDragGestures(
                        onDragEnd = {
                            val vertical = abs(dragY) > abs(dragX)
                            when {
                                vertical && dragY > ARTWORK_SWIPE_THRESHOLD -> nav.back()
                                !vertical && dragX <= -ARTWORK_SWIPE_THRESHOLD -> onNext()
                                !vertical && dragX >= ARTWORK_SWIPE_THRESHOLD -> onPrevious()
                            }
                            dragX = 0f
                            dragY = 0f
                        },
                        onDragCancel = {
                            dragX = 0f
                            dragY = 0f
                        },
                        onDrag = { change, amount ->
                            change.consume()
                            dragX += amount.x
                            dragY += amount.y
                        }
                    )
                }
        )

        Spacer(Modifier.height(24.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    track.title,
                    style = MaterialTheme.typography.headlineMedium,
                    maxLines = 1,
                    modifier = Modifier.marquee(animate)
                )
                Text(
                    track.artistLine,
                    style = MaterialTheme.typography.bodyLarge,
                    color = OnSurfaceVariant,
                    maxLines = 1,
                    modifier = Modifier.marquee(animate)
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
                onClick = { vm.downloadTrack(track) }
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
        val elapsedMs = (position.durationMs * sliderValue).toLong()
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                formatDurationMs(elapsedMs),
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant
            )
            Text(
                // Counting down reads better when you are watching the clock.
                "-" + formatDurationMs(position.durationMs - elapsedMs),
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

        // Only shown while armed — a permanent "sleep timer: off" row is noise.
        val sleepLeft = sleepRemaining
        if (sleepLeft != null || sleepEndOfTrack) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                MusicyChip(
                    label = if (sleepLeft != null) {
                        "Sleeping in ${formatDurationMs(sleepLeft)}"
                    } else {
                        "Sleeping after this track"
                    },
                    selected = true,
                    onClick = { showSleep = true }
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TextButton(onClick = { lyricsFullscreen = true }) {
                Icon(Icons.Default.Lyrics, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Lyrics")
            }
            TextButton(onClick = { showSleep = true }) {
                Icon(Icons.Default.Bedtime, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Sleep")
            }
            TextButton(onClick = { showQueue = true }) {
                Icon(Icons.Default.QueueMusic, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Queue · ${state.queue.size}")
            }
        }

        // A peek at what is coming, so the queue sheet is an option rather than
        // the only way to know what is next.
        val upNext = state.queue.drop(state.currentIndex + 1).take(3)
        if (upNext.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            Text("Up next", style = MaterialTheme.typography.labelLarge, color = OnSurfaceVariant)
            upNext.forEachIndexed { offset, next ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Artwork(
                        url = vm.repo.resolveUrl(next.artworkUrl),
                        contentDescription = next.title,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.size(38.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            next.title,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            next.artistLine,
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    TextButton(onClick = {
                        val target = state.currentIndex + 1 + offset
                        if (remote) vm.remoteSkipTo(target) else vm.player.skipTo(target)
                    }) {
                        Text("Play")
                    }
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }

    if (showQueue) {
        QueueSheet(
            queue = state.queue,
            currentIndex = state.currentIndex,
            resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
            onDismiss = { showQueue = false },
            // The other device owns its queue: taps become playTrack commands
            // and removal is a no-op rather than a lie.
            onSkipTo = { if (remote) vm.remoteSkipTo(it) else vm.player.skipTo(it) },
            onRemove = { if (!remote) vm.player.removeFromQueue(it) }
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

    if (showMenu) {
        PlayerMenuSheet(
            sleepLabel = sleepRemaining?.let { formatDurationMs(it) }
                ?: if (sleepEndOfTrack) "end of track" else "off",
            speedLabel = if (settings.playbackSpeed == 1f) "normal" else "${settings.playbackSpeed}x",
            onDismiss = { showMenu = false },
            onSleepTimer = { showSleep = true },
            onTune = { showTune = true },
            onAddToPlaylist = { showPlaylistPicker = true },
            onOpenAlbum = track.album?.id?.takeIf { it.isNotBlank() }?.let { id -> { nav.album(id) } },
            onOpenArtist = track.artist?.id?.takeIf { it.isNotBlank() }?.let { id -> { nav.artist(id) } },
            onEqualizer = { vm.openEqualizer() }
        )
    }

    if (showSleep) {
        SleepTimerSheet(
            remainingMs = sleepRemaining,
            endOfTrack = sleepEndOfTrack,
            onDismiss = { showSleep = false },
            onSelectMinutes = {
                vm.player.setSleepTimer(it)
                vm.showToast("Pausing in $it minutes")
            },
            onEndOfTrack = {
                vm.player.sleepAtEndOfTrack()
                vm.showToast("Pausing after this track")
            },
            onCancel = {
                vm.player.cancelSleepTimer()
                vm.showToast("Sleep timer off")
            }
        )
    }

    if (showTune) {
        PlaybackTuneSheet(
            speed = settings.playbackSpeed,
            volume = settings.defaultVolume,
            onDismiss = { showTune = false },
            onSpeed = { vm.setPlaybackSpeed(it) },
            onVolume = { vm.setDefaultVolume(it) }
        )
    }

    if (showPlaylistPicker) {
        AddToPlaylistSheet(
            playlists = library.valueOrNull?.playlists.orEmpty(),
            resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
            onDismiss = { showPlaylistPicker = false },
            onSelect = { vm.addToPlaylist(it.id, track.id) },
            onCreate = { name ->
                vm.createPlaylist(name) { created ->
                    if (created != null) vm.addToPlaylist(created.id, track.id)
                }
                showPlaylistPicker = false
            }
        )
    }
}

/** Horizontal drag feedback that stays out of the layout pass. */
private fun Modifier.nudge(value: Float): Modifier = layout { measurable, constraints ->
    val placeable = measurable.measure(constraints)
    layout(placeable.width, placeable.height) {
        placeable.placeRelative(value.roundToInt(), 0)
    }
}

/**
 * The big-player lyrics view: cover art shrinks to a header line and the lyrics
 * fill the screen, matching the web app's expanded player. Transport stays at
 * the bottom so you can still control playback while reading along.
 */
@Composable
private fun FullscreenLyrics(vm: MusicyViewModel, onClose: () -> Unit) {
    val state by vm.playback.collectAsState()
    val position by vm.position.collectAsState()
    val settings by vm.settings.collectAsState()
    val track = state.currentTrack

    if (track == null) {
        onClose()
        return
    }

    val remote = vm.isRemoteControlling
    val haptics = settings.hapticFeedback
    val accent by rememberArtworkColor(vm.repo.resolveUrl(track.artworkUrl), fallback = Primary)

    val onTogglePlay = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause()
    }
    val onNext = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("next") else vm.player.next()
    }
    val onPrevious = rememberHapticClick(haptics) {
        if (remote) vm.sendRemoteCommand("previous") else vm.player.previous()
    }
    val onSeek: (Long) -> Unit = { target ->
        if (remote) vm.sendRemoteCommand("seek", target / 1000.0) else vm.player.seekTo(target)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        accent.copy(alpha = 0.85f),
                        accent.copy(alpha = 0.35f),
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .padding(horizontal = 16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Artwork(
                url = vm.repo.resolveUrl(track.artworkUrl),
                contentDescription = track.title,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(44.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    track.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    modifier = Modifier.marquee(!settings.reducedMotion)
                )
                Text(
                    track.artistLine,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ExpandMore, contentDescription = "Close lyrics")
            }
        }

        // The lyrics take all the space left between the header and the
        // controls.
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            LyricsPanel(
                vm = vm,
                track = track,
                position = position,
                onSeek = onSeek,
                fillHeight = true
            )
        }

        Slider(
            value = position.progress,
            onValueChange = { fraction -> onSeek((position.durationMs * fraction).toLong()) },
            colors = SliderDefaults.colors(
                thumbColor = Primary,
                activeTrackColor = Primary,
                inactiveTrackColor = Outline
            )
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onPrevious) {
                Icon(Icons.Default.SkipPrevious, contentDescription = "Previous track", modifier = Modifier.size(34.dp))
            }
            PlayPauseButton(isPlaying = state.isPlaying, onClick = onTogglePlay, size = 60.dp)
            IconButton(enabled = state.hasNext || remote, onClick = onNext) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next track", modifier = Modifier.size(34.dp))
            }
        }
    }
}
