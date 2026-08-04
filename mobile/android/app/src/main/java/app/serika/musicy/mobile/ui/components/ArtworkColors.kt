package app.serika.musicy.mobile.ui.components

import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.animation.animateColorAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.core.graphics.ColorUtils
import androidx.palette.graphics.Palette
import app.serika.musicy.mobile.ui.theme.Primary
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Pulls a dominant colour out of the current artwork so the player can tint
 * itself to the song, the way the web app does.
 *
 * The result is darkened and desaturation-clamped: raw palette colours are
 * often too bright to put white text on, and a wash of neon behind the
 * controls reads as a bug rather than a flourish.
 */
@Composable
fun rememberArtworkColor(imageUrl: String?, fallback: Color = Primary): State<Color> {
    val context = LocalContext.current
    var target by remember { mutableStateOf(fallback) }

    LaunchedEffect(imageUrl) {
        if (imageUrl.isNullOrBlank()) {
            target = fallback
            return@LaunchedEffect
        }
        val extracted = withContext(Dispatchers.IO) {
            runCatching {
                val request = ImageRequest.Builder(context)
                    .data(imageUrl)
                    .allowHardware(false) // Palette needs to read the pixels back.
                    .size(128)
                    .build()
                val result = context.imageLoader.execute(request) as? SuccessResult
                val bitmap = (result?.drawable as? BitmapDrawable)?.bitmap
                bitmap?.let(::dominantColor)
            }.getOrNull()
        }
        target = extracted ?: fallback
    }

    return animateColorAsState(targetValue = target, label = "artworkColor")
}

private fun dominantColor(bitmap: Bitmap): Color? {
    val palette = Palette.from(bitmap).clearFilters().maximumColorCount(16).generate()
    val swatch = palette.vibrantSwatch
        ?: palette.darkVibrantSwatch
        ?: palette.mutedSwatch
        ?: palette.dominantSwatch
        ?: return null

    val hsl = FloatArray(3)
    ColorUtils.colorToHSL(swatch.rgb, hsl)
    // Keep it dark and never fully saturated so foreground text stays legible.
    hsl[1] = hsl[1].coerceIn(0.25f, 0.75f)
    hsl[2] = hsl[2].coerceIn(0.22f, 0.42f)
    return Color(ColorUtils.HSLToColor(hsl))
}

/** Convenience for gradients that need the colour at a couple of strengths. */
fun Color.asPlayerGradient(): List<Color> = listOf(
    copy(alpha = 0.55f),
    copy(alpha = 0.18f),
    Color.Transparent
)

internal fun Color.toArgbInt(): Int = toArgb()
