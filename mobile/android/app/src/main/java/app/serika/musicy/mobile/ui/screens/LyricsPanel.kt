package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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

    // derivedStateOf keeps the whole list from recomposing on every frame — the
    // provider is read each frame, but only a change of *which* line is active
    // triggers a recomposition here.
    val activeIndex by remember(lines) {
        derivedStateOf { lines.indexOfLast { it.timeMs <= positionProvider() }.coerceAtLeast(0) }
    }

    // Auto-scroll pauses while the user is dragging, so following along by hand
    // doesn't fight the animation.
    val userScrolling by remember { derivedStateOf { listState.isScrollInProgress } }
    var lastAuto by remember { mutableIntStateOf(-1) }

    LaunchedEffect(activeIndex, userScrolling) {
        if (userScrolling || activeIndex == lastAuto) return@LaunchedEffect
        lastAuto = activeIndex
        val target = (activeIndex - 2).coerceAtLeast(0)
        if (animate) listState.animateScrollToItem(target) else listState.scrollToItem(target)
    }

    LazyColumn(
        state = listState,
        modifier = if (fillHeight) Modifier.fillMaxSize() else Modifier.fillMaxWidth().height(340.dp),
        // Fullscreen pads top and bottom so the active line can settle near the
        // middle of the screen, the way the web big player centres it.
        contentPadding = if (fillHeight) PaddingValues(vertical = 120.dp) else PaddingValues(0.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        items(lines.size, key = { "${it}_${lines[it].timeMs}" }) { index ->
            val line = lines[index]
            val active = index == activeIndex
            val romanizedText = romanizedByTime[line.timeMs]?.takeIf { it.isNotBlank() && it != line.text }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSeek(line.timeMs) }
                    .padding(horizontal = 16.dp, vertical = if (fillHeight) 10.dp else 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = when {
                        romanizedText != null && !showBoth -> romanizedText
                        else -> line.text.ifBlank { "♪" }
                    },
                    fontSize = when {
                        active && fillHeight -> 27.sp
                        active -> 22.sp
                        fillHeight -> 22.sp
                        else -> 19.sp
                    },
                    lineHeight = when {
                        active && fillHeight -> 36.sp
                        active -> 30.sp
                        fillHeight -> 30.sp
                        else -> 26.sp
                    },
                    fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                    color = if (active) Color.White else OnSurfaceVariant.copy(alpha = 0.45f),
                    textAlign = TextAlign.Center
                )
                if (romanizedText != null && showBoth) {
                    Text(
                        text = romanizedText,
                        style = MaterialTheme.typography.bodyMedium,
                        fontStyle = FontStyle.Italic,
                        color = if (active) Color.White.copy(alpha = 0.75f) else OnSurfaceVariant.copy(alpha = 0.35f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 2.dp)
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
