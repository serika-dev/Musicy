package app.serika.musicy.mobile.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.ui.theme.SurfaceVariant

/**
 * Placeholder blocks shown while a screen loads.
 *
 * A shaped skeleton tells you what is about to appear; a centred spinner tells
 * you only that something is happening, which makes a slow connection feel
 * like a hang.
 */
@Composable
private fun shimmerAlpha(): Float {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.75f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmerAlpha"
    )
    return alpha
}

@Composable
fun SkeletonBlock(
    modifier: Modifier = Modifier,
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(8.dp)
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(SurfaceVariant.copy(alpha = shimmerAlpha()))
    )
}

@Composable
fun SkeletonLine(width: Dp, height: Dp = 12.dp, modifier: Modifier = Modifier) {
    SkeletonBlock(modifier = modifier.size(width = width, height = height), shape = RoundedCornerShape(4.dp))
}

/** Mirrors the shape of a track list while it loads. */
@Composable
fun TrackListSkeleton(rows: Int = 6, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        repeat(rows) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonBlock(Modifier.size(48.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    SkeletonLine(160.dp)
                    Spacer(Modifier.height(6.dp))
                    SkeletonLine(96.dp, 10.dp)
                }
            }
        }
    }
}

/** Mirrors the home screen: a hero, a chip row and two carousels. */
@Composable
fun HomeSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            SkeletonLine(200.dp, 30.dp)
            Spacer(Modifier.height(8.dp))
            SkeletonLine(140.dp, 12.dp)
        }

        SkeletonBlock(
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .fillMaxWidth()
                .height(180.dp),
            shape = RoundedCornerShape(16.dp)
        )

        repeat(2) {
            Column {
                SkeletonLine(120.dp, 18.dp, Modifier.padding(horizontal = 16.dp))
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    repeat(3) {
                        Column {
                            SkeletonBlock(Modifier.size(136.dp), RoundedCornerShape(10.dp))
                            Spacer(Modifier.height(8.dp))
                            SkeletonLine(100.dp, 10.dp)
                        }
                    }
                }
            }
        }
    }
}

/** Mirrors a detail page: big square art, title lines and a track list. */
@Composable
fun DetailSkeleton(circular: Boolean = false, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        SkeletonBlock(
            modifier = Modifier.size(190.dp),
            shape = if (circular) CircleShape else RoundedCornerShape(12.dp)
        )
        Spacer(Modifier.height(16.dp))
        SkeletonLine(180.dp, 22.dp)
        Spacer(Modifier.height(8.dp))
        SkeletonLine(120.dp, 12.dp)
        Spacer(Modifier.height(20.dp))
        TrackListSkeleton(rows = 5)
    }
}

/** Neutral placeholder used where a bespoke shape would be overkill. */
@Composable
fun ListSkeleton(rows: Int = 8, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        repeat(rows) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonBlock(Modifier.size(52.dp))
                Spacer(Modifier.width(14.dp))
                Column {
                    SkeletonLine(180.dp)
                    Spacer(Modifier.height(6.dp))
                    SkeletonLine(110.dp, 10.dp)
                }
            }
        }
    }
}
