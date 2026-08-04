package app.serika.musicy.mobile.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.theme.LikeRed
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Outline
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant

/** mm:ss, or h:mm:ss for anything over an hour. */
fun formatDuration(seconds: Int?): String {
    val total = seconds ?: return "--:--"
    val hours = total / 3600
    val minutes = (total % 3600) / 60
    val secs = total % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, secs) else "%d:%02d".format(minutes, secs)
}

fun formatDurationMs(ms: Long): String = formatDuration((ms / 1000).toInt())

/**
 * Scrolls a title that is too long to fit instead of cutting it off with an
 * ellipsis. Honours the reduced-motion preference, where a permanently moving
 * label is exactly the thing the user asked us not to do.
 */
@OptIn(ExperimentalFoundationApi::class)
fun Modifier.marquee(enabled: Boolean = true): Modifier =
    if (enabled) this.basicMarquee(iterations = Int.MAX_VALUE, delayMillis = 1_500) else this

/** Cover art with a violet-tinted placeholder when a URL is missing. */
@Composable
fun Artwork(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(10.dp),
    icon: ImageVector = Icons.Default.MusicNote
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(
                Brush.linearGradient(
                    listOf(Primary.copy(alpha = 0.28f), SurfaceVariant)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        if (url.isNullOrBlank()) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = OnSurfaceVariant,
                modifier = Modifier.fillMaxSize(0.36f)
            )
        } else {
            AsyncImage(
                model = url,
                contentDescription = contentDescription,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        if (actionLabel != null && onAction != null) {
            TextButton(onClick = onAction) {
                Text(actionLabel, style = MaterialTheme.typography.labelMedium, color = Primary)
            }
        }
    }
}

/**
 * The square (or circular, for artists) tile used in every carousel — the
 * mobile counterpart of the web app's `media-card`.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MediaCard(
    title: String,
    subtitle: String?,
    imageUrl: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 148.dp,
    circular: Boolean = false,
    icon: ImageVector = Icons.Default.Album,
    onPlay: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .width(width)
            .clip(RoundedCornerShape(12.dp))
            // Holding a card starts it, so the small play badge is a shortcut
            // rather than the only way in.
            .combinedClickable(onClick = onClick, onLongClick = onPlay)
            .padding(6.dp)
    ) {
        Box {
            Artwork(
                url = imageUrl,
                contentDescription = title,
                shape = if (circular) CircleShape else RoundedCornerShape(10.dp),
                icon = icon,
                modifier = Modifier
                    .size(width - 12.dp)
                    .aspectRatio(1f)
            )
            if (onPlay != null) {
                FilledIconButton(
                    onClick = onPlay,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp)
                        .size(38.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = Primary,
                        contentColor = Color.White
                    )
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Play $title")
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = if (circular) TextAlign.Center else TextAlign.Start,
            modifier = if (circular) Modifier.fillMaxWidth() else Modifier
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = if (circular) TextAlign.Center else TextAlign.Start,
                modifier = if (circular) Modifier.fillMaxWidth() else Modifier
            )
        }
    }
}

/** One row in a track list. Shows a violet title while it is the active song. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TrackRow(
    track: Track,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    index: Int? = null,
    isCurrent: Boolean = false,
    isPlaying: Boolean = false,
    isLiked: Boolean = false,
    showArtwork: Boolean = true,
    artworkUrl: String? = null,
    onToggleLike: (() -> Unit)? = null,
    onMore: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            // Long-press opens the same menu as the overflow button: reaching
            // for a 36dp target is not how anyone actually uses a track list.
            .combinedClickable(onClick = onClick, onLongClick = onMore)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (index != null && !showArtwork) {
            Box(modifier = Modifier.width(28.dp), contentAlignment = Alignment.Center) {
                if (isCurrent && isPlaying) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                } else {
                    Text(
                        "$index",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isCurrent) Primary else OnSurfaceVariant
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
        }
        if (showArtwork) {
            Artwork(
                url = artworkUrl,
                contentDescription = track.title,
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(8.dp)
            )
            Spacer(Modifier.width(12.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                style = MaterialTheme.typography.titleSmall,
                color = if (isCurrent) Primary else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = track.artistLine,
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(
            text = formatDuration(track.duration),
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 8.dp)
        )
        if (onToggleLike != null) {
            IconButton(onClick = onToggleLike, modifier = Modifier.size(36.dp)) {
                Icon(
                    imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = if (isLiked) "Remove from Liked Songs" else "Add to Liked Songs",
                    tint = if (isLiked) LikeRed else OnSurfaceVariant,
                    modifier = Modifier.size(19.dp)
                )
            }
        }
        if (onMore != null) {
            IconButton(onClick = onMore, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Default.MoreVert, contentDescription = "More options", tint = OnSurfaceVariant, modifier = Modifier.size(19.dp))
            }
        }
    }
}

@Composable
fun VerifiedBadge(modifier: Modifier = Modifier) {
    Icon(
        imageVector = Icons.Default.Verified,
        contentDescription = "Verified artist",
        tint = Primary,
        modifier = modifier.size(16.dp)
    )
}

@Composable
fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.MusicNote,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(SurfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = OnSurfaceVariant, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceVariant,
            textAlign = TextAlign.Center
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(16.dp))
            Button(onClick = onAction) { Text(actionLabel) }
        }
    }
}

@Composable
fun ScreenLoader(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize().padding(48.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Primary)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onRetry) {
            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Try again")
        }
    }
}

/** Pill-shaped filter chip used for genres and library tabs. */
@Composable
fun MusicyChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.clip(CircleShape).clickable(onClick = onClick),
        color = if (selected) Primary else SurfaceVariant,
        contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp)
        )
    }
}

/** Big round play/pause used on detail headers and the full player. */
@Composable
fun PlayPauseButton(
    isPlaying: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 56.dp
) {
    FilledIconButton(
        onClick = onClick,
        modifier = modifier.size(size),
        colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = Primary,
            contentColor = Color.White
        )
    ) {
        Icon(
            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
            contentDescription = if (isPlaying) "Pause" else "Play",
            modifier = Modifier.size(size * 0.5f)
        )
    }
}

@Composable
fun BackButton(onBack: () -> Unit, modifier: Modifier = Modifier) {
    IconButton(onClick = onBack, modifier = modifier) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
    }
}

@Composable
fun MusicyDivider(modifier: Modifier = Modifier) {
    HorizontalDivider(modifier = modifier, color = Outline)
}
