package app.serika.musicy.mobile.data.preferences

import android.content.Context
import android.os.Build
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.serika.musicy.mobile.data.model.UserSettings
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Every preference the app exposes.
 *
 * Values marked *account* are mirrored to `/api/user/settings` so they follow
 * the user to the web app and to a reinstall; the rest describe this specific
 * phone and stay local.
 */
data class AppSettings(
    // -- this device --------------------------------------------------------
    val deviceId: String = "",
    val deviceName: String = "",
    val syncEnabled: Boolean = true,
    val resumeOnLaunch: Boolean = true,
    val downloadOnWifiOnly: Boolean = true,
    val hapticFeedback: Boolean = true,
    val skipSilence: Boolean = false,
    val playbackSpeed: Float = 1f,
    val seekStepSeconds: Int = 10,

    // -- account (synced) ---------------------------------------------------
    val autoplayRecommendations: Boolean = true,
    val gaplessPlayback: Boolean = true,
    val privateSession: Boolean = false,
    val allowScrobbling: Boolean = true,
    val normalizeVolume: Boolean = false,
    val defaultVolume: Float = 1f,
    val audioQuality: String = "auto",
    val preferSyncedLyrics: Boolean = true,
    val autoRomanizeLyrics: Boolean = false,
    val romanizeLanguage: String = "auto",
    val showRomanizationAlongside: Boolean = false,
    val reducedMotion: Boolean = false,
    val compactMode: Boolean = false,
    val showNowPlayingNotifications: Boolean = false
) {
    /** The slice the server knows about. */
    fun toUserSettings(): UserSettings = UserSettings(
        autoRomanizeLyrics = autoRomanizeLyrics,
        romanizeLanguage = romanizeLanguage,
        showRomanizationAlongside = showRomanizationAlongside,
        reducedMotion = reducedMotion,
        compactMode = compactMode,
        audioQuality = audioQuality,
        normalizeVolume = normalizeVolume,
        defaultVolume = defaultVolume,
        autoplayRecommendations = autoplayRecommendations,
        gaplessPlayback = gaplessPlayback,
        showNowPlayingNotifications = showNowPlayingNotifications,
        privateSession = privateSession,
        allowScrobbling = allowScrobbling
    )
}

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "app_settings")

class AppSettingsStore(context: Context) {
    private val dataStore = context.settingsDataStore

    private companion object {
        val DEVICE_ID = stringPreferencesKey("device_id")
        val DEVICE_NAME = stringPreferencesKey("device_name")
        val SYNC_ENABLED = booleanPreferencesKey("sync_enabled")
        val RESUME_ON_LAUNCH = booleanPreferencesKey("resume_on_launch")
        val WIFI_ONLY = booleanPreferencesKey("download_wifi_only")
        val HAPTICS = booleanPreferencesKey("haptic_feedback")
        val SKIP_SILENCE = booleanPreferencesKey("skip_silence")
        val SPEED = floatPreferencesKey("playback_speed")
        val SEEK_STEP = intPreferencesKey("seek_step_seconds")

        val AUTOPLAY = booleanPreferencesKey("autoplay_recommendations")
        val GAPLESS = booleanPreferencesKey("gapless_playback")
        val PRIVATE_SESSION = booleanPreferencesKey("private_session")
        val SCROBBLING = booleanPreferencesKey("allow_scrobbling")
        val NORMALIZE = booleanPreferencesKey("normalize_volume")
        val VOLUME = floatPreferencesKey("default_volume")
        val QUALITY = stringPreferencesKey("audio_quality")
        val SYNCED_LYRICS = booleanPreferencesKey("prefer_synced_lyrics")
        val ROMANIZE = booleanPreferencesKey("auto_romanize_lyrics")
        val ROMANIZE_LANG = stringPreferencesKey("romanize_language")
        val ROMANIZE_ALONGSIDE = booleanPreferencesKey("show_romanization_alongside")
        val REDUCED_MOTION = booleanPreferencesKey("reduced_motion")
        val COMPACT = booleanPreferencesKey("compact_mode")
        val NOW_PLAYING_NOTIF = booleanPreferencesKey("now_playing_notifications")
    }

    /** e.g. "Pixel 8 (Android 14)" — what other devices see in the switcher. */
    private val defaultDeviceName: String = buildString {
        val manufacturer = Build.MANUFACTURER.orEmpty().replaceFirstChar { it.uppercase() }
        val model = Build.MODEL.orEmpty()
        append(if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model")
        if (isBlank()) append("Android device")
        append(" (Android ${Build.VERSION.RELEASE})")
    }.trim()

    val settings: Flow<AppSettings> = dataStore.data.map { prefs ->
        val defaults = AppSettings()
        AppSettings(
            deviceId = prefs[DEVICE_ID].orEmpty(),
            deviceName = prefs[DEVICE_NAME] ?: defaultDeviceName,
            syncEnabled = prefs[SYNC_ENABLED] ?: defaults.syncEnabled,
            resumeOnLaunch = prefs[RESUME_ON_LAUNCH] ?: defaults.resumeOnLaunch,
            downloadOnWifiOnly = prefs[WIFI_ONLY] ?: defaults.downloadOnWifiOnly,
            hapticFeedback = prefs[HAPTICS] ?: defaults.hapticFeedback,
            skipSilence = prefs[SKIP_SILENCE] ?: defaults.skipSilence,
            playbackSpeed = prefs[SPEED] ?: defaults.playbackSpeed,
            seekStepSeconds = prefs[SEEK_STEP] ?: defaults.seekStepSeconds,
            autoplayRecommendations = prefs[AUTOPLAY] ?: defaults.autoplayRecommendations,
            gaplessPlayback = prefs[GAPLESS] ?: defaults.gaplessPlayback,
            privateSession = prefs[PRIVATE_SESSION] ?: defaults.privateSession,
            allowScrobbling = prefs[SCROBBLING] ?: defaults.allowScrobbling,
            normalizeVolume = prefs[NORMALIZE] ?: defaults.normalizeVolume,
            defaultVolume = prefs[VOLUME] ?: defaults.defaultVolume,
            audioQuality = prefs[QUALITY] ?: defaults.audioQuality,
            preferSyncedLyrics = prefs[SYNCED_LYRICS] ?: defaults.preferSyncedLyrics,
            autoRomanizeLyrics = prefs[ROMANIZE] ?: defaults.autoRomanizeLyrics,
            romanizeLanguage = prefs[ROMANIZE_LANG] ?: defaults.romanizeLanguage,
            showRomanizationAlongside = prefs[ROMANIZE_ALONGSIDE] ?: defaults.showRomanizationAlongside,
            reducedMotion = prefs[REDUCED_MOTION] ?: defaults.reducedMotion,
            compactMode = prefs[COMPACT] ?: defaults.compactMode,
            showNowPlayingNotifications = prefs[NOW_PLAYING_NOTIF] ?: defaults.showNowPlayingNotifications
        )
    }

    /**
     * Stable per-install id used as the sync device id. Generated on first read
     * so the phone keeps the same identity across restarts and updates.
     */
    suspend fun ensureDeviceId(): String {
        var id = ""
        dataStore.edit { prefs ->
            val existing = prefs[DEVICE_ID]
            if (existing.isNullOrBlank()) {
                val generated = "dev_and_" + java.util.UUID.randomUUID().toString().replace("-", "").take(16)
                prefs[DEVICE_ID] = generated
                id = generated
            } else {
                id = existing
            }
            if (prefs[DEVICE_NAME].isNullOrBlank()) prefs[DEVICE_NAME] = defaultDeviceName
        }
        return id
    }

    // -- device -------------------------------------------------------------

    suspend fun setDeviceName(value: String) = edit { it[DEVICE_NAME] = value.trim().ifBlank { defaultDeviceName } }
    suspend fun setSyncEnabled(value: Boolean) = edit { it[SYNC_ENABLED] = value }
    suspend fun setResumeOnLaunch(value: Boolean) = edit { it[RESUME_ON_LAUNCH] = value }
    suspend fun setDownloadOnWifiOnly(value: Boolean) = edit { it[WIFI_ONLY] = value }
    suspend fun setHapticFeedback(value: Boolean) = edit { it[HAPTICS] = value }
    suspend fun setSkipSilence(value: Boolean) = edit { it[SKIP_SILENCE] = value }
    suspend fun setPlaybackSpeed(value: Float) = edit { it[SPEED] = value.coerceIn(0.5f, 2f) }
    suspend fun setSeekStepSeconds(value: Int) = edit { it[SEEK_STEP] = value.coerceIn(5, 60) }

    // -- account ------------------------------------------------------------

    suspend fun setAutoplayRecommendations(value: Boolean) = edit { it[AUTOPLAY] = value }
    suspend fun setGaplessPlayback(value: Boolean) = edit { it[GAPLESS] = value }
    suspend fun setPrivateSession(value: Boolean) = edit { it[PRIVATE_SESSION] = value }
    suspend fun setAllowScrobbling(value: Boolean) = edit { it[SCROBBLING] = value }
    suspend fun setNormalizeVolume(value: Boolean) = edit { it[NORMALIZE] = value }
    suspend fun setDefaultVolume(value: Float) = edit { it[VOLUME] = value.coerceIn(0f, 1f) }
    suspend fun setAudioQuality(value: String) = edit { it[QUALITY] = value }
    suspend fun setPreferSyncedLyrics(value: Boolean) = edit { it[SYNCED_LYRICS] = value }
    suspend fun setAutoRomanizeLyrics(value: Boolean) = edit { it[ROMANIZE] = value }
    suspend fun setRomanizeLanguage(value: String) = edit { it[ROMANIZE_LANG] = value }
    suspend fun setShowRomanizationAlongside(value: Boolean) = edit { it[ROMANIZE_ALONGSIDE] = value }
    suspend fun setReducedMotion(value: Boolean) = edit { it[REDUCED_MOTION] = value }
    suspend fun setCompactMode(value: Boolean) = edit { it[COMPACT] = value }
    suspend fun setShowNowPlayingNotifications(value: Boolean) = edit { it[NOW_PLAYING_NOTIF] = value }

    /**
     * Applies settings pulled from the account. Only account-scoped keys are
     * touched, so a hand-off never clobbers this phone's own preferences.
     */
    suspend fun applyFromAccount(remote: UserSettings) = edit { prefs ->
        prefs[ROMANIZE] = remote.autoRomanizeLyrics
        prefs[ROMANIZE_LANG] = remote.romanizeLanguage
        prefs[ROMANIZE_ALONGSIDE] = remote.showRomanizationAlongside
        prefs[REDUCED_MOTION] = remote.reducedMotion
        prefs[COMPACT] = remote.compactMode
        prefs[QUALITY] = remote.audioQuality
        prefs[NORMALIZE] = remote.normalizeVolume
        prefs[VOLUME] = remote.defaultVolume
        prefs[AUTOPLAY] = remote.autoplayRecommendations
        prefs[GAPLESS] = remote.gaplessPlayback
        prefs[NOW_PLAYING_NOTIF] = remote.showNowPlayingNotifications
        prefs[PRIVATE_SESSION] = remote.privateSession
        prefs[SCROBBLING] = remote.allowScrobbling
    }

    /** Restores defaults but keeps this device's sync identity. */
    suspend fun resetToDefaults() = edit { prefs ->
        val id = prefs[DEVICE_ID]
        val name = prefs[DEVICE_NAME]
        prefs.clear()
        if (id != null) prefs[DEVICE_ID] = id
        if (name != null) prefs[DEVICE_NAME] = name
    }

    // DataStore's transform is a suspending lambda; a plain function type is
    // not a subtype of it.
    private suspend fun edit(block: suspend (MutablePreferences) -> Unit) {
        dataStore.edit(block)
    }
}
