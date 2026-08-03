package app.serika.musicy.mobile.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

/**
 * Wraps a click so it produces a tick the moment the finger lands.
 *
 * Transport controls talk to a media session, which can take a frame or two to
 * report back; the haptic confirms the press immediately so the app never feels
 * like it ignored you.
 */
@Composable
fun rememberHapticClick(enabled: Boolean, onClick: () -> Unit): () -> Unit {
    val haptics = LocalHapticFeedback.current
    return remember(enabled, onClick, haptics) {
        {
            if (enabled) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onClick()
        }
    }
}
