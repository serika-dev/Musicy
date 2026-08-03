package app.serika.musicy.mobile.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.theme.*
import coil.compose.AsyncImage

@Composable
fun BottomPlayer(
    track: Track,
    isPlaying: Boolean,
    onToggle: () -> Unit,
    onOpen: () -> Unit
) {
    Surface(
        color = Surface.copy(alpha = 0.95f),
        tonalElevation = 8.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() }
    ) {
        Column {
            LinearProgressIndicator(
                progress = 0.25f,
                modifier = Modifier.fillMaxWidth(),
                color = Primary,
                trackColor = SurfaceHighlight
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AsyncImage(
                    model = track.album?.coverImageUrl ?: track.coverImageUrl,
                    contentDescription = track.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(10.dp))
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = track.title,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = OnBackground
                    )
                    Text(
                        text = track.artist?.name ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                IconButton(onClick = onToggle) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = OnBackground
                    )
                }
            }
        }
    }
}
