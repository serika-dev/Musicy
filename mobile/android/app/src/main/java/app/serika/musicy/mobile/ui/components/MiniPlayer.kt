package app.serika.musicy.mobile.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.player.PlaybackUiState
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Outline
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import kotlin.math.abs
import kotlin.math.roundToInt

/** How far a drag has to travel before it counts as a gesture, in pixels. */
private const val SWIPE_THRESHOLD = 90f

/**
 * The floating now-playing bar, matching the web app's rounded player card
 * that sits just above the bottom navigation.
 *
 * Swipeable the way people expect a now-playing bar to be: sideways changes
 * track, upwards opens the full player.
 */
@Composable
fun MiniPlayer(
    state: PlaybackUiState,
    progress: Float,
    isLiked: Boolean,
    artworkUrl: String?,
    onOpen: () -> Unit,
    onTogglePlay: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onToggleLike: () -> Unit,
    modifier: Modifier = Modifier,
    animate: Boolean = true
) {
    AnimatedVisibility(
        visible = state.currentTrack != null,
        enter = slideInVertically { it },
        exit = slideOutVertically { it },
        modifier = modifier
    ) {
        val track = state.currentTrack ?: return@AnimatedVisibility

        // Tint the card towards the artwork so the bar belongs to the song.
        val accent by rememberArtworkColor(artworkUrl, fallback = Primary)
        val container = accent.copy(alpha = 0.22f).compositeOver(SurfaceVariant)

        var dragX by remember { mutableFloatStateOf(0f) }
        var dragY by remember { mutableFloatStateOf(0f) }
        // Follows the finger at a third of the distance: enough to show the
        // gesture landed, not so much that the bar leaves the screen.
        val offsetX by animateFloatAsState(targetValue = dragX / 3f, label = "miniPlayerDrag")

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp)
                .offsetX(offsetX)
                .clip(RoundedCornerShape(16.dp))
                .background(container)
                .pointerInput(track.id) {
                    detectDragGestures(
                        onDragEnd = {
                            val vertical = abs(dragY) > abs(dragX)
                            when {
                                vertical && dragY < -SWIPE_THRESHOLD -> onOpen()
                                !vertical && dragX <= -SWIPE_THRESHOLD -> onNext()
                                !vertical && dragX >= SWIPE_THRESHOLD -> onPrevious()
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
                .clickable(onClick = onOpen)
        ) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp),
                color = Primary,
                trackColor = Outline
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Artwork(
                    url = artworkUrl,
                    contentDescription = track.title,
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.KeyboardArrowUp,
                            contentDescription = null,
                            tint = OnSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(2.dp))
                        Text(
                            track.title,
                            style = MaterialTheme.typography.titleSmall,
                            maxLines = 1,
                            modifier = Modifier.marquee(animate)
                        )
                    }
                    Text(
                        track.artistLine,
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceVariant,
                        maxLines = 1,
                        modifier = Modifier.marquee(animate)
                    )
                }
                IconButton(onClick = onToggleLike) {
                    Icon(
                        imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = if (isLiked) "Remove from Liked Songs" else "Add to Liked Songs",
                        tint = if (isLiked) LikeRed else OnSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
                PlayPauseButton(
                    isPlaying = state.isPlaying,
                    onClick = onTogglePlay,
                    size = 40.dp
                )
                IconButton(onClick = onNext, enabled = state.hasNext) {
                    Icon(
                        Icons.Default.SkipNext,
                        contentDescription = "Next track",
                        tint = if (state.hasNext) MaterialTheme.colorScheme.onSurface else OnSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * Horizontal nudge that does not re-measure the layout.
 *
 * `Modifier.offset` would be the obvious choice, but placing the card by hand
 * keeps the drag feedback out of the layout pass entirely.
 */
private fun Modifier.offsetX(value: Float): Modifier = layout { measurable, constraints ->
    val placeable = measurable.measure(constraints)
    layout(placeable.width, placeable.height) {
        placeable.placeRelative(value.roundToInt(), 0)
    }
}
