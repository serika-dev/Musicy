package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.player.PlaybackPosition
import app.serika.musicy.mobile.ui.components.rememberSmoothPosition
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.Async
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** One line of an LRC file. */
data class LyricLine(val timeMs: Long, val text: String)

/**
 * The lyrics pane, matching the web player: big centred lines, the active one
 * bright and the rest dimmed, tap a line to jump there, and optional
 * romanization either replacing the original or sitting beneath it.
 */
@Composable
fun LyricsPanel(
    vm: MusicyViewModel,
    track: Track,
    position: PlaybackPosition,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier,
    /** When true the lyric list fills the space it is given instead of a fixed
     *  box — used by the fullscreen big-player view. */
    fillHeight: Boolean = false
) {
    // Frame-accurate playhead: the active line lands on the beat instead of
    // stepping with the quarter-second session reports.
    val smoothPosition = rememberSmoothPosition(position)
    val settings by vm.settings.collectAsState()
    val lyrics by loadAsync(track.id) { vm.repo.lyrics(track.id) }
    val data = lyrics.valueOrNull

    val synced = remember(data, settings.preferSyncedLyrics) {
        if (settings.preferSyncedLyrics) parseLrc(data?.syncedLyrics) else emptyList()
    }
    val useSynced = synced.isNotEmpty()

    // Romanization is fetched lazily and only when the user asked for it. The
    // server caches per track, so this is a single round-trip per song.
    var romanized by remember(track.id, settings.autoRomanizeLyrics, settings.romanizeLanguage) {
        mutableStateOf<String?>(null)
    }
    var romanizing by remember(track.id) { mutableStateOf(false) }

    LaunchedEffect(track.id, settings.autoRomanizeLyrics, settings.romanizeLanguage, useSynced, data) {
        romanized = null
        if (!settings.autoRomanizeLyrics || data?.hasAnything != true) return@LaunchedEffect
        romanizing = true
        romanized = withContext(Dispatchers.IO) {
            vm.repo.romanizedLyrics(track.id, if (useSynced) "synced" else "plain")
        }
        romanizing = false
    }

    /** Romanized text keyed by the original line's timestamp. */
    val romanizedByTime = remember(romanized, useSynced) {
        if (!useSynced) emptyMap() else parseLrc(romanized).associate { it.timeMs to it.text }
    }

    Column(modifier = if (fillHeight) modifier.fillMaxSize() else modifier.fillMaxWidth()) {
        when {
            lyrics is Async.Loading -> Box(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator(color = Primary) }

            data == null || !data.hasAnything -> Text(
                "No lyrics found for this track.",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp)
            )

            useSynced -> SyncedLyrics(
                lines = synced,
                romanizedByTime = romanizedByTime,
                positionProvider = { smoothPosition.value },
                showBoth = settings.showRomanizationAlongside,
                animate = !settings.reducedMotion,
                fillHeight = fillHeight,
                onSeek = onSeek
            )

            else -> PlainLyrics(
                original = data.plainLyrics ?: data.syncedLyrics.orEmpty(),
                romanized = romanized,
                showBoth = settings.showRomanizationAlongside,
                fillHeight = fillHeight
            )
        }

        if (romanizing) {
            Text(
                "Romanizing…",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp)
            )
        }
    }
}

@Composable
private fun SyncedLyrics(
    lines: List<LyricLine>,
    romanizedByTime: Map<Long, String>,
    positionProvider: () -> Long,
    showBoth: Boolean,
    animate: Boolean,
    fillHeight: Boolean,
    onSeek: (Long) -> Unit
) {
    val listState = rememberLazyListState()

    // -1 until the first line's timestamp is reached — before anything is sung,
    // and while the playhead sits before line zero, nothing is highlighted, the
    // way the web player leaves it blank. (The old coerceAtLeast(0) lit up the
    // first line during the intro.)
    val activeIndex by remember(lines) {
        derivedStateOf { lines.indexOfLast { it.timeMs <= positionProvider() } }
    }

    // Only a real finger-drag should pause the auto-scroll. Keying the effect
    // on isScrollInProgress instead was self-defeating: our own programmatic
    // scroll flips that flag, which cancelled the scroll the instant it began,
    // so the lyrics never moved.
    val userDragging by listState.interactionSource.collectIsDraggedAsState()

    // Keep the active line pinned to the middle of the viewport, smoothly.
    LaunchedEffect(activeIndex) {
        if (activeIndex < 0 || userDragging) return@LaunchedEffect
        if (animate) listState.centerItemAnimated(activeIndex) else listState.centerItemInstant(activeIndex)
    }

    LazyColumn(
        state = listState,
        modifier = if (fillHeight) Modifier.fillMaxSize() else Modifier.fillMaxWidth().height(340.dp),
        // Generous top/bottom padding so the first and last lines can still sit
        // dead-centre when they are active.
        contentPadding = if (fillHeight) PaddingValues(vertical = 160.dp) else PaddingValues(vertical = 120.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Keys are positional: LRC files legitimately repeat a timestamp (think
        // choruses), and duplicate keys crash LazyColumn.
        items(lines.size, key = { it }) { index ->
            val line = lines[index]
            val active = index == activeIndex
            val romanizedText = romanizedByTime[line.timeMs]?.takeIf { it.isNotBlank() && it != line.text }

            // The web app's `transition-all duration-500`: the active line grows
            // slightly, brightens to full white and picks up a soft glow, while
            // the rest fade back. Everything animates rather than snapping.
            val spec = tween<Float>(durationMillis = if (animate) 450 else 0)
            val scale by animateFloatAsState(if (active) 1.06f else 1f, spec, label = "lyricScale")
            val glow by animateFloatAsState(if (active) 0.8f else 0f, spec, label = "lyricGlow")
            val color by animateColorAsState(
                targetValue = if (active) Color.White else OnSurfaceVariant.copy(alpha = 0.32f),
                animationSpec = tween(durationMillis = if (animate) 450 else 0),
                label = "lyricColor"
            )
            val baseSp = if (fillHeight) 28f else 21f

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .graphicsLayer { scaleX = scale; scaleY = scale }
                    .clickable { onSeek(line.timeMs) }
                    .padding(horizontal = 20.dp, vertical = if (fillHeight) 12.dp else 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // A blank LRC line (an instrumental marker) stays blank — nothing
                // is being sung, so nothing shows.
                val text = when {
                    romanizedText != null && !showBoth -> romanizedText
                    else -> line.text
                }
                if (text.isNotBlank()) {
                    Text(
                        text = text,
                        fontSize = baseSp.sp,
                        lineHeight = (baseSp * 1.3f).sp,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                        color = color,
                        textAlign = TextAlign.Center,
                        style = if (glow > 0f) {
                            LocalTextStyle.current.copy(
                                shadow = Shadow(
                                    color = Color.White.copy(alpha = glow),
                                    blurRadius = 32f
                                )
                            )
                        } else {
                            LocalTextStyle.current
                        }
                    )
                }
                if (romanizedText != null && showBoth && line.text.isNotBlank()) {
                    Text(
                        text = romanizedText,
                        fontSize = (baseSp * 0.6f).sp,
                        fontStyle = FontStyle.Italic,
                        color = if (active) Color.White.copy(alpha = 0.7f) else OnSurfaceVariant.copy(alpha = 0.3f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun PlainLyrics(original: String, romanized: String?, showBoth: Boolean, fillHeight: Boolean = false) {
    val body = romanized?.takeIf { it.isNotBlank() && it != original }
    Column(
        modifier = (if (fillHeight) Modifier.fillMaxSize() else Modifier.fillMaxWidth().height(340.dp))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = if (fillHeight) 24.dp else 0.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = if (body != null && !showBoth) body else original,
            style = if (fillHeight) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.bodyLarge,
            color = Color.White.copy(alpha = 0.85f),
            textAlign = TextAlign.Center
        )
        if (body != null && showBoth) {
            Spacer(Modifier.height(16.dp))
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                fontStyle = FontStyle.Italic,
                color = OnSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * Scrolls so item [index] sits in the middle of the viewport.
 *
 * Item heights vary (a one-word line and a long line are not the same size),
 * so we cannot centre with a fixed offset — we measure where the item actually
 * landed and glide the difference.
 */
private suspend fun LazyListState.centerItemAnimated(index: Int) {
    val info = layoutInfo
    val item = info.visibleItemsInfo.firstOrNull { it.index == index }
    if (item == null) {
        // Off-screen after a seek: jump close, then nudge to exact centre.
        animateScrollToItem(index)
        centerItemInstant(index)
        return
    }
    val viewportCenter = (info.viewportStartOffset + info.viewportEndOffset) / 2f
    val itemCenter = item.offset + item.size / 2f
    animateScrollBy(itemCenter - viewportCenter)
}

private suspend fun LazyListState.centerItemInstant(index: Int) {
    val info = layoutInfo
    val item = info.visibleItemsInfo.firstOrNull { it.index == index } ?: run {
        scrollToItem(index)
        return
    }
    val viewportCenter = (info.viewportStartOffset + info.viewportEndOffset) / 2f
    val itemCenter = item.offset + item.size / 2f
    scrollBy(itemCenter - viewportCenter)
}

/** Parses `[mm:ss.xx] text` lines out of an LRC payload. */
fun parseLrc(raw: String?): List<LyricLine> {
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
