package app.serika.musicy.mobile.data.downloads

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import app.serika.musicy.mobile.R

/** Shows a single grouped notification while tracks are downloading. */
object DownloadNotifier {
    private const val CHANNEL = "musicy_downloads"
    private const val ID = 42

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Downloads", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Progress while saving tracks for offline"
                setShowBadge(false)
            }
        )
    }

    fun update(context: Context, active: Int, progress: Float?) {
        ensureChannel(context)
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (active <= 0) {
            manager.cancel(ID)
            return
        }
        val pct = ((progress ?: 0f) * 100).toInt().coerceIn(0, 100)
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(if (active == 1) "Downloading track" else "Downloading $active tracks")
            .setContentText("$pct%")
            .setProgress(100, pct, progress == null)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .build()
        manager.notify(ID, notification)
    }
}
