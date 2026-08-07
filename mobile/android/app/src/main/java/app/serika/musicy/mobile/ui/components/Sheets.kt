package app.serika.musicy.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlaylistAdd
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Playlist
import app.serika.musicy.mobile.data.model.SyncDevice
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicySheet(
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        content = content
    )
}

@Composable
private fun SheetTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        modifier = modifier.padding(horizontal = 20.dp, vertical = 12.dp)
    )
}

@Composable
private fun SheetAction(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    tint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(16.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge, color = tint)
    }
}

/** Long-press / overflow menu for a track, mirroring the web context menu. */
@Composable
fun TrackActionsSheet(
    track: Track,
    isLiked: Boolean,
    artworkUrl: String?,
    onDismiss: () -> Unit,
    onToggleLike: () -> Unit,
    onPlayNext: () -> Unit,
    onAddToQueue: () -> Unit,
    onAddToPlaylist: () -> Unit,
    onOpenAlbum: (() -> Unit)?,
    onOpenArtist: (() -> Unit)?,
    onRemove: (() -> Unit)? = null,
    isDownloaded: Boolean = false,
    isDownloading: Boolean = false,
    onToggleDownload: (() -> Unit)? = null
) {
    MusicySheet(onDismiss = onDismiss) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Artwork(
                url = artworkUrl,
                contentDescription = track.title,
                modifier = Modifier.size(52.dp),
                shape = RoundedCornerShape(8.dp)
            )
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(track.title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    track.artistLine,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        MusicyDivider(Modifier.padding(vertical = 8.dp))
        SheetAction(
            label = if (isLiked) "Remove from Liked Songs" else "Add to Liked Songs",
            icon = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            tint = if (isLiked) LikeRed else MaterialTheme.colorScheme.onSurface,
            onClick = { onToggleLike(); onDismiss() }
        )
        SheetAction("Play next", Icons.Default.QueueMusic, { onPlayNext(); onDismiss() })
        SheetAction("Add to queue", Icons.Default.Add, { onAddToQueue(); onDismiss() })
        SheetAction("Add to playlist", Icons.Default.PlaylistAdd, { onAddToPlaylist(); onDismiss() })
        if (onToggleDownload != null) {
            SheetAction(
                label = when {
                    isDownloading -> "Downloading…"
                    isDownloaded -> "Remove download"
                    else -> "Download"
                },
                icon = if (isDownloaded) Icons.Default.DownloadDone else Icons.Default.Download,
                tint = if (isDownloaded) Primary else MaterialTheme.colorScheme.onSurface,
                onClick = { if (!isDownloading) { onToggleDownload(); onDismiss() } }
            )
        }
        if (onOpenAlbum != null) SheetAction("Go to album", Icons.Default.Album, { onOpenAlbum(); onDismiss() })
        if (onOpenArtist != null) SheetAction("Go to artist", Icons.Default.Person, { onOpenArtist(); onDismiss() })
        if (onRemove != null) {
            SheetAction("Remove from this playlist", Icons.Default.Close, { onRemove(); onDismiss() }, tint = LikeRed)
        }
        Spacer(Modifier.height(24.dp))
    }
}

/** "Up next" — the live queue, reorderable by removal and jumpable by tap. */
@Composable
fun QueueSheet(
    queue: List<Track>,
    currentIndex: Int,
    resolveArtwork: (Track) -> String?,
    onDismiss: () -> Unit,
    onSkipTo: (Int) -> Unit,
    onRemove: (Int) -> Unit
) {
    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Queue · ${queue.size} tracks")
        if (queue.isEmpty()) {
            EmptyState(
                title = "Nothing queued",
                message = "Play an album or playlist to fill the queue.",
                icon = Icons.Default.QueueMusic
            )
        } else {
            LazyColumn(modifier = Modifier.heightIn(max = 480.dp)) {
                itemsIndexed(queue, key = { index, track -> "$index-${track.id}" }) { index, track ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TrackRow(
                            track = track,
                            artworkUrl = resolveArtwork(track),
                            isCurrent = index == currentIndex,
                            onClick = { onSkipTo(index) },
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { onRemove(index) }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Remove from queue",
                                tint = OnSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * Musicy Connect device picker — the same hand-off the web player's
 * `DeviceSwitcher` offers, so playback can move between phone and browser.
 */
@Composable
fun DeviceSheet(
    devices: List<SyncDevice>,
    thisDeviceId: String,
    activeDeviceId: String?,
    connected: Boolean,
    onDismiss: () -> Unit,
    onPlayHere: () -> Unit,
    onTransfer: (SyncDevice) -> Unit
) {
    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Connect to a device")
        Text(
            text = if (connected) "Pick where Musicy should play." else "Not connected to the sync service.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp)
        )
        Spacer(Modifier.height(12.dp))

        DeviceRow(
            name = "This phone",
            subtitle = if (activeDeviceId == thisDeviceId) "Playing here" else "Tap to play here",
            icon = Icons.Default.PhoneAndroid,
            selected = activeDeviceId == thisDeviceId,
            onClick = { onPlayHere(); onDismiss() }
        )

        devices.filterNot { it.id == thisDeviceId }.forEach { device ->
            DeviceRow(
                name = device.name,
                subtitle = if (device.isActive) "Currently playing" else "Available",
                icon = Icons.Default.Computer,
                selected = device.id == activeDeviceId,
                onClick = { onTransfer(device); onDismiss() }
            )
        }

        if (devices.none { it.id != thisDeviceId }) {
            Text(
                "No other devices online. Open Musicy in a browser to see it here.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun DeviceRow(
    name: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(if (selected) Primary.copy(alpha = 0.2f) else SurfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) Primary else OnSurfaceVariant, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleSmall, color = if (selected) Primary else MaterialTheme.colorScheme.onSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
        }
        if (selected) Icon(Icons.Default.Cast, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
    }
}

/** The overflow menu on the full player. */
@Composable
fun PlayerMenuSheet(
    sleepLabel: String,
    speedLabel: String,
    onDismiss: () -> Unit,
    onSleepTimer: () -> Unit,
    onTune: () -> Unit,
    onAddToPlaylist: () -> Unit,
    onOpenAlbum: (() -> Unit)?,
    onOpenArtist: (() -> Unit)?,
    onEqualizer: () -> Unit,
    onShare: (() -> Unit)? = null
) {
    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Now playing")
        SheetAction("Sleep timer · $sleepLabel", Icons.Default.Bedtime, { onSleepTimer(); onDismiss() })
        SheetAction("Speed & volume · $speedLabel", Icons.Default.Speed, { onTune(); onDismiss() })
        SheetAction("Equaliser", Icons.Default.GraphicEq, { onEqualizer(); onDismiss() })
        SheetAction("Add to playlist", Icons.Default.PlaylistAdd, { onAddToPlaylist(); onDismiss() })
        if (onOpenAlbum != null) SheetAction("Go to album", Icons.Default.Album, { onOpenAlbum(); onDismiss() })
        if (onOpenArtist != null) SheetAction("Go to artist", Icons.Default.Person, { onOpenArtist(); onDismiss() })
        if (onShare != null) SheetAction("Share", Icons.Default.Share, { onShare(); onDismiss() })
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * Sets or clears the sleep timer.
 *
 * "End of track" is deliberately separate from the minute presets: falling
 * asleep mid-song is the thing the feature exists to prevent.
 */
@Composable
fun SleepTimerSheet(
    remainingMs: Long?,
    endOfTrack: Boolean,
    onDismiss: () -> Unit,
    onSelectMinutes: (Int) -> Unit,
    onEndOfTrack: () -> Unit,
    onCancel: () -> Unit
) {
    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Sleep timer")
        Text(
            text = when {
                remainingMs != null -> "Stopping in ${formatDurationMs(remainingMs)}"
                endOfTrack -> "Stopping at the end of this song"
                else -> "Musicy will pause on its own once the time is up."
            },
            style = MaterialTheme.typography.bodySmall,
            color = if (remainingMs != null || endOfTrack) Primary else OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp)
        )
        Spacer(Modifier.height(14.dp))
        // Scrollable rather than wrapped: a preset that falls off the edge on a
        // narrow phone is a preset the user cannot pick.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(5, 10, 15, 30, 45, 60, 90).forEach { minutes ->
                MusicyChip(
                    label = "$minutes min",
                    selected = false,
                    onClick = { onSelectMinutes(minutes); onDismiss() }
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        SheetAction("End of this track", Icons.Default.Bedtime, { onEndOfTrack(); onDismiss() })
        if (remainingMs != null || endOfTrack) {
            SheetAction("Turn off timer", Icons.Default.Close, { onCancel(); onDismiss() }, tint = LikeRed)
        }
        Spacer(Modifier.height(24.dp))
    }
}

/** Playback speed and output volume, without leaving the player. */
@Composable
fun PlaybackTuneSheet(
    speed: Float,
    volume: Float,
    onDismiss: () -> Unit,
    onSpeed: (Float) -> Unit,
    onVolume: (Float) -> Unit
) {
    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Speed & volume")
        Text(
            "Playback speed",
            style = MaterialTheme.typography.labelMedium,
            color = OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp)
        )
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(0.75f, 1f, 1.25f, 1.5f, 2f).forEach { value ->
                MusicyChip(
                    label = if (value == 1f) "Normal" else "${value}x",
                    selected = speed == value,
                    onClick = { onSpeed(value) }
                )
            }
        }
        Spacer(Modifier.height(18.dp))
        Text(
            "Volume · ${(volume * 100).toInt()}%",
            style = MaterialTheme.typography.labelMedium,
            color = OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp)
        )
        Slider(
            value = volume,
            onValueChange = onVolume,
            modifier = Modifier.padding(horizontal = 20.dp),
            colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary)
        )
        Spacer(Modifier.height(24.dp))
    }
}

/** Picks (or creates) a playlist to drop a track into. */
@Composable
fun AddToPlaylistSheet(
    playlists: List<Playlist>,
    resolveArtwork: (Playlist) -> String?,
    onDismiss: () -> Unit,
    onSelect: (Playlist) -> Unit,
    onCreate: (String) -> Unit
) {
    var newName by remember { mutableStateOf("") }

    MusicySheet(onDismiss = onDismiss) {
        SheetTitle("Add to playlist")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = newName,
                onValueChange = { newName = it },
                placeholder = { Text("New playlist name") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            FilledIconButton(
                onClick = {
                    if (newName.isNotBlank()) {
                        onCreate(newName.trim())
                        newName = ""
                    }
                },
                enabled = newName.isNotBlank()
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create playlist")
            }
        }
        MusicyDivider(Modifier.padding(vertical = 8.dp))
        LazyColumn(modifier = Modifier.heightIn(max = 380.dp)) {
            items(playlists, key = { it.id }) { playlist ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(playlist); onDismiss() }
                        .padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Artwork(
                        url = resolveArtwork(playlist),
                        contentDescription = playlist.name,
                        modifier = Modifier.size(44.dp),
                        shape = RoundedCornerShape(8.dp),
                        icon = Icons.Default.QueueMusic
                    )
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(playlist.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${playlist.trackCount} tracks", style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
