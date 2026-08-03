package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.ui.components.MediaCard
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel

@Composable
fun SearchScreen(viewModel: AppViewModel) {
    var query by remember { mutableStateOf("") }
    val results = viewModel.searchResults

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Search tracks, albums, artists...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { viewModel.search(query) },
            enabled = query.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Search")
        }
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val tracks = results?.tracks?.items ?: emptyList()
            val albums = results?.albums?.items ?: emptyList()
            val artists = results?.artists?.items ?: emptyList()

            if (tracks.isNotEmpty()) {
                item { Text("Tracks", style = MaterialTheme.typography.titleMedium) }
                items(tracks) { track ->
                    MediaCard(
                        imageUrl = track.album?.coverImageUrl ?: track.coverImageUrl,
                        title = track.title,
                        subtitle = track.artist?.name,
                        modifier = Modifier.fillMaxWidth(),
                        onPlay = { viewModel.playTrack(track, listOf(track)) }
                    )
                }
            }

            if (albums.isNotEmpty()) {
                item { Text("Albums", style = MaterialTheme.typography.titleMedium) }
                items(albums) { album ->
                    MediaCard(
                        imageUrl = album.coverImageUrl,
                        title = album.title,
                        subtitle = album.artist?.name,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            if (artists.isNotEmpty()) {
                item { Text("Artists", style = MaterialTheme.typography.titleMedium) }
                items(artists) { artist ->
                    MediaCard(
                        imageUrl = artist.imageUrl,
                        title = artist.name,
                        subtitle = null,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}
