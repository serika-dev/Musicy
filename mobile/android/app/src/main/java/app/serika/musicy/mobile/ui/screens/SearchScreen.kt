package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.ui.components.MediaCard
import app.serika.musicy.mobile.ui.components.TrackItem
import app.serika.musicy.mobile.ui.theme.*
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(viewModel: AppViewModel) {
    var query by remember { mutableStateOf("") }
    val results = viewModel.searchResults
    val loading = viewModel.isLoading

    Column(modifier = Modifier.fillMaxSize().background(Background).padding(16.dp)) {
        Text("Search", style = MaterialTheme.typography.headlineMedium, color = OnBackground)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Songs, artists, albums, playlists...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = OnSurfaceVariant) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Surface,
                unfocusedContainerColor = Surface,
                focusedBorderColor = Primary,
                unfocusedBorderColor = Outline
            ),
            singleLine = true
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = { viewModel.search(query) },
            enabled = query.isNotBlank() && !loading,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = OnPrimary)
            else Text("Search")
        }
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            if (query.isBlank()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                        Text(
                            "Type above to search your library and catalog.",
                            textAlign = TextAlign.Center,
                            color = OnSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                return@LazyColumn
            }

            val tracks = results?.tracks?.items ?: emptyList()
            val albums = results?.albums?.items ?: emptyList()
            val artists = results?.artists?.items ?: emptyList()

            if (results != null && tracks.isEmpty() && albums.isEmpty() && artists.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                        Text(
                            "No results for \"$query\"",
                            textAlign = TextAlign.Center,
                            color = OnSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            if (tracks.isNotEmpty()) {
                item {
                    Text("Tracks", style = MaterialTheme.typography.titleLarge, color = OnBackground)
                }
                items(tracks) { track ->
                    TrackItem(track = track) { viewModel.playTrack(track, listOf(track)) }
                }
            }

            if (albums.isNotEmpty()) {
                item {
                    Text("Albums", style = MaterialTheme.typography.titleLarge, color = OnBackground)
                    Spacer(modifier = Modifier.height(6.dp))
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        albums.take(3).forEach { album ->
                            MediaCard(
                                imageUrl = album.coverImageUrl,
                                title = album.title,
                                subtitle = album.artist?.name,
                                onPlay = {
                                    album.tracks?.firstOrNull()?.let { first ->
                                        viewModel.playTrack(first, album.tracks ?: emptyList())
                                    }
                                }
                            )
                        }
                    }
                }
            }

            if (artists.isNotEmpty()) {
                item {
                    Text("Artists", style = MaterialTheme.typography.titleLarge, color = OnBackground)
                    Spacer(modifier = Modifier.height(6.dp))
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        artists.take(3).forEach { artist ->
                            MediaCard(
                                imageUrl = artist.imageUrl,
                                title = artist.name,
                                subtitle = null
                            )
                        }
                    }
                }
            }
        }
    }
}
