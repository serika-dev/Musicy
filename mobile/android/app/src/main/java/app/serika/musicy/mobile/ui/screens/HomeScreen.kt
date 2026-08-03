package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Album
import app.serika.musicy.mobile.data.model.Artist
import app.serika.musicy.mobile.data.model.DailyMix
import app.serika.musicy.mobile.ui.components.MediaCard
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel

@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val mixes = viewModel.dailyMixes
    val albums = viewModel.albums
    val artists = viewModel.artists
    val playlists = viewModel.playlists

    LaunchedEffect(Unit) {
        if (mixes.isEmpty()) viewModel.loadHome()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item { GreetingHeader() }

        if (mixes.isNotEmpty()) {
            item { Section("Your Daily Mixes") }
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp)
                ) {
                    items(mixes) { mix ->
                        MediaCard(
                            imageUrl = mix.coverImageUrl,
                            title = mix.name,
                            subtitle = mix.description,
                            onPlay = {
                                mix.tracks?.firstOrNull()?.let { first ->
                                    viewModel.playTrack(first, mix.tracks)
                                }
                            }
                        )
                    }
                }
            }
        }

        if (albums.isNotEmpty()) {
            item { Section("New Albums") }
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp)
                ) {
                    items(albums) { album ->
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
            item { Section("Artists") }
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp)
                ) {
                    items(artists) { artist ->
                        MediaCard(
                            imageUrl = artist.imageUrl,
                            title = artist.name,
                            subtitle = null
                        )
                    }
                }
            }
        }

        if (playlists.isNotEmpty()) {
            item { Section("Community Playlists") }
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp)
                ) {
                    items(playlists) { playlist ->
                        MediaCard(
                            imageUrl = playlist.coverImageUrl,
                            title = playlist.name,
                            subtitle = "${playlist.count?.tracks ?: 0} tracks",
                            onPlay = {
                                playlist.tracks?.firstOrNull()?.track?.let { first ->
                                    val list = playlist.tracks?.map { it.track } ?: emptyList()
                                    viewModel.playTrack(first, list)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GreetingHeader() {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 0..4 -> "Good night"
        in 5..11 -> "Good morning"
        in 12..17 -> "Good afternoon"
        else -> "Good evening"
    }
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Text(
            text = "$greeting.",
            style = MaterialTheme.typography.displaySmall
        )
        Text(
            text = "Ready to lose yourself in the music?",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun Section(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.padding(horizontal = 16.dp)
    )
}
