package app.serika.musicy.mobile.widget

import android.content.Context
import app.serika.musicy.mobile.data.model.Track

/**
 * Tiny SharedPreferences snapshot the home-screen widget reads. The player
 * and the library write here; the widget never talks to the network.
 */
object WidgetSnapshotStore {
    private const val PREFS = "musicy_widget"
    const val KEY_TITLE = "title"
    const val KEY_ARTIST = "artist"
    const val KEY_LIKED = "liked_count"
    const val KEY_MIX_ID = "mix_id"
    const val KEY_MIX_NAME = "mix_name"

    data class Snapshot(
        val title: String?,
        val artist: String?,
        val likedCount: Int,
        val mixId: String?,
        val mixName: String?
    )

    fun read(context: Context): Snapshot {
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return Snapshot(
            title = p.getString(KEY_TITLE, null),
            artist = p.getString(KEY_ARTIST, null),
            likedCount = p.getInt(KEY_LIKED, 0),
            mixId = p.getString(KEY_MIX_ID, null),
            mixName = p.getString(KEY_MIX_NAME, null)
        )
    }

    fun updateContinue(context: Context, track: Track?, remaining: Int = 0) {
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        p.edit()
            .putString(KEY_TITLE, track?.title)
            .putString(KEY_ARTIST, track?.artistLine?.let { line ->
                if (remaining > 1) "$line · $remaining in queue" else line
            })
            .apply()
        MusicyWidgetProvider.refresh(context)
    }

    fun updateLikedCount(context: Context, count: Int) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putInt(KEY_LIKED, count).apply()
        MusicyWidgetProvider.refresh(context)
    }

    fun saveLastMix(context: Context, id: String, name: String) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_MIX_ID, id)
            .putString(KEY_MIX_NAME, name)
            .apply()
        MusicyWidgetProvider.refresh(context)
    }
}
