package app.serika.musicy.mobile.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import app.serika.musicy.mobile.data.api.MusicyApi
import app.serika.musicy.mobile.data.model.*
import kotlinx.coroutines.launch

class AppViewModel(val api: MusicyApi) : ViewModel() {
    var dailyMixes by mutableStateOf<List<DailyMix>>(emptyList())
        private set
    var albums by mutableStateOf<List<Album>>(emptyList())
        private set
    var artists by mutableStateOf<List<Artist>>(emptyList())
        private set
    var playlists by mutableStateOf<List<Playlist>>(emptyList())
        private set
    var searchResults by mutableStateOf<SearchResponse?>(null)
        private set
    var currentTrack by mutableStateOf<Track?>(null)
        private set
    var queue by mutableStateOf<List<Track>>(emptyList())
        private set
    var isPlaying by mutableStateOf(false)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    var feed by mutableStateOf<FeedResponse?>(null)
        private set
    var feedLoaded by mutableStateOf(false)
        private set

    fun loadHome() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response = api.getFeed()
                feed = response
                feedLoaded = true
                dailyMixes = api.getDailyMixes()
                albums = api.getAlbums(limit = 20).albums
                artists = api.getArtists(limit = 20).artists
                playlists = api.getPlaylists(limit = 20).playlists
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Failed to load home"
            } finally {
                isLoading = false
            }
        }
    }

    fun search(query: String) {
        viewModelScope.launch {
            isLoading = true
            try {
                searchResults = api.search(query = query, limit = 20)
            } catch (e: Exception) {
                errorMessage = e.localizedMessage
            } finally {
                isLoading = false
            }
        }
    }

    fun playTrack(track: Track, tracks: List<Track> = listOf(track)) {
        currentTrack = track
        queue = tracks
        isPlaying = true
    }

    fun togglePlayPause() {
        isPlaying = !isPlaying
    }

    fun nextTrack() {
        currentTrack?.let { track ->
            val index = queue.indexOfFirst { it.id == track.id }
            if (index >= 0 && index < queue.size - 1) {
                currentTrack = queue[index + 1]
            }
        }
    }

    fun previousTrack() {
        currentTrack?.let { track ->
            val index = queue.indexOfFirst { it.id == track.id }
            if (index > 0) {
                currentTrack = queue[index - 1]
            }
        }
    }

    class Factory(private val api: MusicyApi) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AppViewModel(api) as T
        }
    }
}
