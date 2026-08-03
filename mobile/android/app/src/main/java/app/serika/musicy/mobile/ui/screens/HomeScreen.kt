package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.ui.components.MediaCard
import app.serika.musicy.mobile.ui.theme.*
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel
import coil.compose.AsyncImage
import java.util.Calendar

@Composable
fun HomeScreen(viewModel: AppViewModel, userName: String) {
    val feed = viewModel.feed
    val isLoading = viewModel.isLoading

    LaunchedEffect(Unit) {
        if (!viewModel.feedLoaded) viewModel.loadHome()
    }

    Box(modifier = Modifier.fillMaxSize().background(Background)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item { GreetingHeader(userName, feed?.featuredAlbum) { first ->
                viewModel.playTrack(first, listOf(first))
            } }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Primary)
                    }
                }
            }

            if (feed?.recentlyPlayed?.isNotEmpty() == true) {
                section("Jump Back In") {
                    TrackRow(feed.recentlyPlayed, viewModel)
                }
            }

            if (viewModel.dailyMixes.isNotEmpty()) {
                section("Made for you") {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp)
                    ) {
                        items(viewModel.dailyMixes) { mix ->
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

            if (feed?.followedAlbums?.isNotEmpty() == true) {
                section("New from Artists You Follow") {
                    AlbumRow(feed.followedAlbums, viewModel)
                }
            }

            if (feed?.recommendedTracks?.isNotEmpty() == true) {
                section("Recommended for You") {
                    TrackRow(feed.recommendedTracks, viewModel)
                }
            }

            if (viewModel.albums.isNotEmpty()) {
                section("New albums") {
                    AlbumRow(viewModel.albums, viewModel)
                }
            }

            if (feed?.topArtists?.isNotEmpty() == true) {
                section("Your Top Artists") {
                    ArtistRow(feed.topArtists)
                }
            }

            if (feed?.recommendedArtists?.isNotEmpty() == true) {
                section("Artists We Think You'll Like") {
                    ArtistRow(feed.recommendedArtists)
                }
            }

            if (feed?.discoverAlbums?.isNotEmpty() == true) {
                section("More to Explore") {
                    AlbumRow(feed.discoverAlbums, viewModel)
                }
            }

            if (viewModel.artists.isNotEmpty()) {
                section("Artists") {
                    ArtistRow(viewModel.artists)
                }
            }

            if (feed?.newReleases?.isNotEmpty() == true) {
                section("New Releases") {
                    AlbumRow(feed.newReleases, viewModel)
                }
            }

            if (viewModel.playlists.isNotEmpty()) {
                section("Community playlists") {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp)
                    ) {
                        items(viewModel.playlists) { playlist ->
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

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun LazyListScope.section(title: String, content: @Composable () -> Unit) {
    item { SectionTitle(title) }
    item { content() }
}

@Composable
private fun AlbumRow(albums: List<Album>, viewModel: AppViewModel) {
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

@Composable
private fun TrackRow(tracks: List<Track>, viewModel: AppViewModel) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(horizontal = 16.dp)
    ) {
        items(tracks) { track ->
            MediaCard(
                imageUrl = track.album?.coverImageUrl ?: track.coverImageUrl,
                title = track.title,
                subtitle = track.artist?.name,
                onPlay = { viewModel.playTrack(track, listOf(track)) }
            )
        }
    }
}

@Composable
private fun ArtistRow(artists: List<Artist>) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(horizontal = 16.dp)
    ) {
        items(artists) { artist ->
            ArtistCard(artist)
        }
    }
}

@Composable
private fun GreetingHeader(userName: String, featured: Album?, onPlay: (Track) -> Unit) {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 0..4 -> "Good night"
        in 5..11 -> "Good morning"
        in 12..17 -> "Good afternoon"
        else -> "Good evening"
    }
    val name = userName.split(" ").firstOrNull() ?: userName
    Column(
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
        Text(
            text = "$greeting, ${name}.",
            style = MaterialTheme.typography.headlineMedium,
            color = OnBackground
        )
        Text(
            text = "Ready to lose yourself in the music?",
            style = MaterialTheme.typography.bodyLarge,
            color = OnSurfaceVariant
        )

        if (featured != null) {
            Spacer(modifier = Modifier.height(18.dp))
            FeaturedHero(album = featured, onPlay = onPlay)
        }
    }
}

@Composable
private fun FeaturedHero(album: Album, onPlay: (Track) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Surface)
            .clickable { album.tracks?.firstOrNull()?.let { onPlay(it) } }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = album.coverImageUrl,
            contentDescription = album.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(16.dp))
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Featured",
                style = MaterialTheme.typography.labelMedium,
                color = Primary
            )
            Text(
                text = album.title,
                style = MaterialTheme.typography.titleLarge,
                color = OnBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = album.artist?.name ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        FloatingActionButton(
            onClick = { album.tracks?.firstOrNull()?.let { onPlay(it) } },
            containerColor = Primary,
            contentColor = OnPrimary,
            modifier = Modifier.size(52.dp),
            shape = CircleShape
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = "Play featured album")
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
                .clip(CircleShape)
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
