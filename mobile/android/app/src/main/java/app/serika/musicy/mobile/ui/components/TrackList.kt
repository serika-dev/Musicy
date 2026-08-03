package app.serika.musicy.mobile.ui.components

import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import app.serika.musicy.mobile.data.model.Playlist
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel

/** Renders a list of tracks inside a LazyColumn with consistent affordances. */
fun LazyListScope.trackItems(
    tracks: List<Track>,
    likedIds: Set<String>,
    currentTrackId: String?,
    isPlaying: Boolean,
    resolveArtwork: (Track) -> String?,
    onPlay: (Int) -> Unit,
    onToggleLike: (Track) -> Unit,
    onMore: (Track) -> Unit,
    numbered: Boolean = false
) {
    itemsIndexedTracks(tracks) { index, track ->
        TrackRow(
            track = track,
            index = if (numbered) index + 1 else null,
            showArtwork = !numbered,
            artworkUrl = resolveArtwork(track),
            isCurrent = track.id == currentTrackId,
            isPlaying = isPlaying,
            isLiked = track.id in likedIds,
            onClick = { onPlay(index) },
            onToggleLike = { onToggleLike(track) },
            onMore = { onMore(track) }
        )
    }
}

/** Keys on index too: a playlist may legitimately contain the same track twice. */
private inline fun LazyListScope.itemsIndexedTracks(
    tracks: List<Track>,
    crossinline content: @Composable (Int, Track) -> Unit
) {
    items(
        count = tracks.size,
        key = { index -> "${index}_${tracks[index].id}" }
    ) { index ->
        content(index, tracks[index])
    }
}

/**
 * Owns the per-track overflow sheet (and the add-to-playlist sheet behind it)
 * so every screen with a track list gets the same menu for free.
 */
@Composable
fun TrackActionsHost(
    vm: MusicyViewModel,
    nav: Nav,
    selected: Track?,
    onDismiss: () -> Unit,
    onRemoveFromPlaylist: ((Track) -> Unit)? = null
) {
    val liked by vm.likedTrackIds.collectAsState()
    val library by vm.library.collectAsState()
    var pendingPlaylistTrack by remember { mutableStateOf<Track?>(null) }

    val track = selected
    // Guarded so the actions sheet is gone before the playlist picker opens;
    // showing both at once left two dimmed scrims stacked on each other.
    if (track != null && pendingPlaylistTrack == null) {
        TrackActionsSheet(
            track = track,
            isLiked = track.id in liked,
            artworkUrl = vm.repo.resolveUrl(track.artworkUrl),
            onDismiss = onDismiss,
            onToggleLike = { vm.toggleLike(track) },
            onPlayNext = { vm.player.playNext(track) },
            onAddToQueue = { vm.player.addToQueue(listOf(track)) },
            onAddToPlaylist = {
                pendingPlaylistTrack = track
                onDismiss()
            },
            onOpenAlbum = track.album?.id?.takeIf { it.isNotBlank() }?.let { id -> { nav.album(id) } },
            onOpenArtist = track.artist?.id?.takeIf { it.isNotBlank() }?.let { id -> { nav.artist(id) } },
            onRemove = onRemoveFromPlaylist?.let { remove -> { remove(track) } }
        )
    }

    val pending = pendingPlaylistTrack
    if (pending != null) {
        val playlists: List<Playlist> = library.valueOrNull?.playlists.orEmpty()
        AddToPlaylistSheet(
            playlists = playlists,
            resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
            onDismiss = { pendingPlaylistTrack = null },
            onSelect = { playlist -> vm.addToPlaylist(playlist.id, pending.id) },
            onCreate = { name ->
                vm.createPlaylist(name) { created ->
                    if (created != null) vm.addToPlaylist(created.id, pending.id)
                }
                pendingPlaylistTrack = null
            }
        )
    }
}
