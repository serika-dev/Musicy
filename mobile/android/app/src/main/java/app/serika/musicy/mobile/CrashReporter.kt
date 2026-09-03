package app.serika.musicy.mobile

import android.content.Context
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Writes uncaught exceptions to files in app-private storage so a crash on a
 * user's phone can be read afterwards instead of vanishing with the process.
 *
 * Installed from [MusicyApplication.onCreate]; it chains to the previous
 * default handler, so system crash handling (dialogs, process death) is
 * unchanged. Reports live for a week and surface in Settings → Diagnostics.
 */
object CrashReporter {

    private const val DIR = "crash-reports"
    private const val MAX_REPORTS = 10
    private const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000

    fun install(context: Context) {
        val appContext = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            runCatching { write(appContext, thread, throwable) }
            previous?.uncaughtException(thread, throwable)
        }
    }

    private fun write(context: Context, thread: Thread, throwable: Throwable) {
        val dir = File(context.filesDir, DIR).apply { mkdirs() }
        prune(dir)
        val stamp = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss", Locale.US).format(Date())
        val stack = StringWriter().also { throwable.printStackTrace(PrintWriter(it)) }.toString()
        val body = buildString {
            appendLine("time: ${Date()}")
            appendLine("thread: ${thread.name}")
            appendLine("app: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
            appendLine("android: ${android.os.Build.VERSION.RELEASE} (${android.os.Build.VERSION.SDK_INT})")
            appendLine("device: ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}")
            appendLine()
            append(stack)
        }
        File(dir, "crash-$stamp.txt").writeText(body)
    }

    /** Newest first. */
    fun reports(context: Context): List<File> =
        File(context.filesDir, DIR).listFiles()?.sortedByDescending { it.name }?.orEmpty() ?: emptyList()

    fun latest(context: Context): File? = reports(context).firstOrNull()

    private fun prune(dir: File) {
        val files = dir.listFiles()?.sortedByDescending { it.name } ?: return
        val cutoff = System.currentTimeMillis() - MAX_AGE_MS
        files.forEachIndexed { index, file ->
            if (index >= MAX_REPORTS || file.lastModified() < cutoff) file.delete()
        }
    }
}
