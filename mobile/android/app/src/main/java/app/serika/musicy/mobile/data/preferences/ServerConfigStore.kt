package app.serika.musicy.mobile.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.serika.musicy.mobile.data.model.ServerConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "server_config")

class ServerConfigStore(context: Context) {
    private val dataStore = context.dataStore

    companion object {
        private val BASE_URL_KEY = stringPreferencesKey("base_url")
        private val API_KEY_KEY = stringPreferencesKey("api_key")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
    }

    val config: Flow<ServerConfig> = dataStore.data.map { prefs ->
        ServerConfig(
            baseUrl = prefs[BASE_URL_KEY] ?: "",
            apiKey = prefs[API_KEY_KEY] ?: "",
            userName = prefs[USER_NAME_KEY]
        )
    }

    suspend fun save(baseUrl: String, apiKey: String, userName: String? = null) {
        val normalized = baseUrl.trim().trimEnd('/')
        dataStore.edit { prefs ->
            prefs[BASE_URL_KEY] = normalized
            prefs[API_KEY_KEY] = apiKey.trim()
            if (userName != null) prefs[USER_NAME_KEY] = userName else prefs.remove(USER_NAME_KEY)
        }
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
