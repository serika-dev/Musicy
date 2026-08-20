package app.serika.musicy.mobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import app.serika.musicy.mobile.MainActivity
import app.serika.musicy.mobile.R

/**
 * 4×2 home-screen widget: resume the last queue, play Liked Songs, or start
 * the last daily mix. Taps open the app with an action the player then honours.
 */
class MusicyWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val snapshot = WidgetSnapshotStore.read(context)
        ids.forEach { id -> manager.updateAppWidget(id, buildViews(context, snapshot)) }
    }

    private fun buildViews(context: Context, snapshot: WidgetSnapshotStore.Snapshot): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.musicy_widget)
        val title = snapshot.title?.takeIf { it.isNotBlank() } ?: "Nothing playing"
        val artist = snapshot.artist?.takeIf { it.isNotBlank() } ?: "Pick a song in Musicy"
        views.setTextViewText(R.id.widget_title, title)
        views.setTextViewText(R.id.widget_artist, artist)

        val likedLabel = if (snapshot.likedCount > 0) "Liked · ${snapshot.likedCount}" else "Liked Songs"
        views.setTextViewText(R.id.widget_liked, likedLabel)
        views.setTextViewText(
            R.id.widget_mix,
            snapshot.mixName?.takeIf { it.isNotBlank() } ?: "Daily mix"
        )

        views.setOnClickPendingIntent(R.id.widget_continue, activity(context, WidgetActions.PLAY_CONTINUE, 1))
        views.setOnClickPendingIntent(R.id.widget_liked, activity(context, WidgetActions.PLAY_LIKED, 2))
        views.setOnClickPendingIntent(R.id.widget_mix, activity(context, WidgetActions.PLAY_MIX, 3))
        return views
    }

    private fun activity(context: Context, action: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            this.action = action
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        fun refresh(context: Context) {
            val app = context.applicationContext
            val manager = AppWidgetManager.getInstance(app)
            val ids = manager.getAppWidgetIds(ComponentName(app, MusicyWidgetProvider::class.java))
            if (ids.isEmpty()) return
            val intent = Intent(app, MusicyWidgetProvider::class.java).apply {
                this.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            app.sendBroadcast(intent)
        }
    }
}
