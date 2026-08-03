package app.serika.musicy.mobile.data.preferences

import android.content.Context
import android.os.Build
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Device-local preferences. Anything that describes *this* phone (its sync
 * identity, whether it participates in Musicy Connect) lives here rather than
 * in the account-wide settings the web app stores server-side.
 */
data class AppSettings(
    val deviceId: String = "",
    val deviceName: String = "",
    val syncEnabled: Boolean = true,
    val autoplayRecommendations: Boolean = true,
    val gaplessPlayback: Boolean = true,
    val privateSession: Boolean = false,
    val preferSyncedLyrics: Boolean = true,
    val defaultVolume: Float = 1f
)

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "app_settings")

class AppSettingsStore(context: Context) {
    private val dataStore = context.settingsDataStore

    private companion object {
        val DEVICE_ID = stringPreferencesKey("device_id")
        val DEVICE_NAME = stringPreferencesKey("device_name")
        val SYNC_ENABLED = booleanPreferencesKey("sync_enabled")
        val AUTOPLAY = booleanPreferencesKey("autoplay_recommendations")
        val GAPLESS = booleanPreferencesKey("gapless_playback")
        val PRIVATE_SESSION = booleanPreferencesKey("private_session")
        val SYNCED_LYRICS = booleanPreferencesKey("prefer_synced_lyrics")
        val VOLUME = floatPreferencesKey("default_volume")
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
        AppSettings(
            deviceId = prefs[DEVICE_ID].orEmpty(),
            deviceName = prefs[DEVICE_NAME] ?: defaultDeviceName,
            syncEnabled = prefs[SYNC_ENABLED] ?: true,
            autoplayRecommendations = prefs[AUTOPLAY] ?: true,
            gaplessPlayback = prefs[GAPLESS] ?: true,
            privateSession = prefs[PRIVATE_SESSION] ?: false,
            preferSyncedLyrics = prefs[SYNCED_LYRICS] ?: true,
            defaultVolume = prefs[VOLUME] ?: 1f
        )
    }

    /**
     * Stable per-install id used as the sync device id. Generated on first read
     * so the phone keeps the same identity across restarts.
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

    suspend fun setDeviceName(value: String) = edit { it[DEVICE_NAME] = value.trim().ifBlank { defaultDeviceName } }
    suspend fun setSyncEnabled(value: Boolean) = edit { it[SYNC_ENABLED] = value }
    suspend fun setAutoplayRecommendations(value: Boolean) = edit { it[AUTOPLAY] = value }
    suspend fun setGaplessPlayback(value: Boolean) = edit { it[GAPLESS] = value }
    suspend fun setPrivateSession(value: Boolean) = edit { it[PRIVATE_SESSION] = value }
    suspend fun setPreferSyncedLyrics(value: Boolean) = edit { it[SYNCED_LYRICS] = value }
    suspend fun setDefaultVolume(value: Float) = edit { it[VOLUME] = value.coerceIn(0f, 1f) }

    private suspend fun edit(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        dataStore.edit(block)
    }
}
