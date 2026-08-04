package app.serika.musicy.mobile.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.searchHistoryDataStore: DataStore<Preferences> by
    preferencesDataStore(name = "search_history")

/**
 * The last few things the user searched for.
 *
 * Stored as one newline-joined string rather than a set, because order is the
 * whole point — the most recent search has to come back first.
 */
class SearchHistoryStore(context: Context) {

    private val dataStore = context.applicationContext.searchHistoryDataStore

    val recent: Flow<List<String>> = dataStore.data.map { prefs ->
        prefs[HISTORY]?.split(SEPARATOR)?.filter { it.isNotBlank() }.orEmpty()
    }

    /** Moves an existing entry back to the top instead of duplicating it. */
    suspend fun add(query: String) {
        val trimmed = query.trim()
        if (trimmed.length < MIN_LENGTH) return
        dataStore.edit { prefs ->
            val current = prefs[HISTORY]?.split(SEPARATOR)?.filter { it.isNotBlank() }.orEmpty()
            val updated = (listOf(trimmed) + current.filterNot { it.equals(trimmed, ignoreCase = true) })
                .take(MAX_ENTRIES)
            prefs[HISTORY] = updated.joinToString(SEPARATOR)
        }
    }

    suspend fun remove(query: String) {
        dataStore.edit { prefs ->
            val current = prefs[HISTORY]?.split(SEPARATOR)?.filter { it.isNotBlank() }.orEmpty()
            prefs[HISTORY] = current.filterNot { it == query }.joinToString(SEPARATOR)
        }
    }

    suspend fun clear() {
        dataStore.edit { it.remove(HISTORY) }
    }

    private companion object {
        val HISTORY = stringPreferencesKey("recent_searches")
        const val SEPARATOR = "\n"
        const val MAX_ENTRIES = 12
        const val MIN_LENGTH = 2
    }
}
