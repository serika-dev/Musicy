package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Album
import app.serika.musicy.mobile.data.model.Artist
import app.serika.musicy.mobile.data.model.DailyMix
import app.serika.musicy.mobile.ui.components.MediaCard
import app.serika.musicy.mobile.ui.theme.*
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel
import coil.compose.AsyncImage
import java.util.Calendar

@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val mixes = viewModel.dailyMixes
    val albums = viewModel.albums
    val artists = viewModel.artists
    val playlists = viewModel.playlists
    val isLoading = viewModel.isLoading

    LaunchedEffect(Unit) {
        if (mixes.isEmpty() && albums.isEmpty()) viewModel.loadHome()
    }

    Box(modifier = Modifier.fillMaxSize().background(Background)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp)
        ) {
            item { GreetingHeader() }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                        CircularProgressIndicator(color = Primary)
                    }
                }
            }

            if (mixes.isNotEmpty()) {
                item { SectionTitle("Made for you") }
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
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
                item { SectionTitle("New albums") }
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
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
                item { SectionTitle("Artists") }
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp)
                    ) {
                        items(artists) { artist ->
                            ArtistCard(artist)
                        }
                    }
                }
            }

            if (playlists.isNotEmpty()) {
                item { SectionTitle("Community playlists") }
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
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
}

@Composable
private fun GreetingHeader() {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 0..4 -> "Good night"
        in 5..11 -> "Good morning"
        in 12..17 -> "Good afternoon"
        else -> "Good evening"
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.linearGradient(
                    listOf(Primary.copy(alpha = 0.25f), SecondaryViolet.copy(alpha = 0.12f))
                )
            )
            .padding(22.dp)
    ) {
        Column {
            Text(
                text = "$greeting.",
                style = MaterialTheme.typography.headlineMedium,
                color = OnBackground
            )
            Text(
                text = "Ready to lose yourself in the music?",
                style = MaterialTheme.typography.bodyLarge,
                color = OnSurfaceVariant
            )
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.padding(horizontal = 16.dp),
        color = OnBackground
    )
}

@Composable
private fun ArtistCard(artist: Artist) {
    Column(
        modifier = Modifier.width(132.dp)
    ) {
        AsyncImage(
            model = artist.imageUrl,
            contentDescription = artist.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(72.dp))
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = artist.name,
            style = MaterialTheme.typography.labelLarge,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            color = OnBackground
        )
    }
}
