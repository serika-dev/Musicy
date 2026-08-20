package app.serika.musicy.mobile.widget

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** One-shot intents from the home-screen widget, consumed by [app.serika.musicy.mobile.ui.MusicyApp]. */
object WidgetActions {
    const val PLAY_CONTINUE = "app.serika.musicy.mobile.WIDGET_PLAY_CONTINUE"
    const val PLAY_LIKED = "app.serika.musicy.mobile.WIDGET_PLAY_LIKED"
    const val PLAY_MIX = "app.serika.musicy.mobile.WIDGET_PLAY_MIX"

    private val _pending = MutableStateFlow<String?>(null)
    val pending: StateFlow<String?> = _pending.asStateFlow()

    fun offer(action: String?) {
        if (action == PLAY_CONTINUE || action == PLAY_LIKED || action == PLAY_MIX) {
            _pending.value = action
        }
    }

    fun consume() {
        _pending.value = null
    }
}
