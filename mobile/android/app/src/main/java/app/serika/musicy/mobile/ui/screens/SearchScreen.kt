package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.*
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Outline
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.Async
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel

private enum class SearchFilter(val label: String) {
    ALL("All"), TRACKS("Songs"), ALBUMS("Albums"), ARTISTS("Artists"), PLAYLISTS("Playlists")
}

@Composable
fun SearchScreen(vm: MusicyViewModel, nav: Nav) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(SearchFilter.ALL) }
    var actionTrack by remember { mutableStateOf<Track?>(null) }

    val results by vm.search.collectAsState()
    val home by vm.home.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val playback by vm.player.state.collectAsState()
    val keyboard = LocalSoftwareKeyboardController.current

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                vm.search(it)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("Songs, albums, artists, playlists") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = OnSurfaceVariant) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = ""; vm.clearSearch() }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear search")
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { keyboard?.hide() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Primary,
                unfocusedBorderColor = Outline,
                focusedContainerColor = SurfaceVariant,
                unfocusedContainerColor = SurfaceVariant
            )
        )

        if (query.isNotBlank()) {
            LazyRowFilters(filter) { filter = it }
        }

        when {
            query.isBlank() -> BrowseCategories(vm, nav, home)

            results is Async.Loading -> ScreenLoader()

            results is Async.Failure -> ErrorBox((results as Async.Failure).message) { vm.search(query) }

            results is Async.Success -> {
                val data = (results as Async.Success).value
                if (data.isEmpty) {
                    EmptyState(
                        title = "No results for “$query”",
                        message = "Check the spelling, or try a different artist or album.",
                        icon = Icons.Default.Search
                    )
                } else {
                    val tracks = data.tracks?.items.orEmpty()
                    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                        if (filter == SearchFilter.ALL || filter == SearchFilter.TRACKS) {
                            if (tracks.isNotEmpty()) {
                                item { SectionHeader("Songs") }
                                trackItems(
                                    tracks = tracks,
                                    likedIds = liked,
                                    currentTrackId = playback.currentTrack?.id,
                                    isPlaying = playback.isPlaying,
                                    resolveArtwork = { vm.repo.resolveUrl(it.artworkUrl) },
                                    onPlay = { index -> vm.play(tracks, index) },
                                    onToggleLike = { vm.toggleLike(it) },
                                    onMore = { actionTrack = it }
                                )
                            }
                        }
                        if (filter == SearchFilter.ALL || filter == SearchFilter.ALBUMS) {
                            val albums = data.albums?.items.orEmpty()
                            if (albums.isNotEmpty()) {
                                albumRow(
                                    title = "Albums",
                                    albums = albums,
                                    resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                                    onOpen = { nav.album(it.id) }
                                )
                            }
                        }
                        if (filter == SearchFilter.ALL || filter == SearchFilter.ARTISTS) {
                            val artists = data.artists?.items.orEmpty()
                            if (artists.isNotEmpty()) {
                                artistRow(
                                    title = "Artists",
                                    artists = artists,
                                    resolveArtwork = { vm.repo.resolveUrl(it.imageUrl) },
                                    onOpen = { nav.artist(it.id) }
                                )
                            }
                        }
                        if (filter == SearchFilter.ALL || filter == SearchFilter.PLAYLISTS) {
                            val playlists = data.playlists?.items.orEmpty()
                            if (playlists.isNotEmpty()) {
                                playlistRow(
                                    title = "Playlists",
                                    playlists = playlists,
                                    resolveArtwork = { vm.repo.resolveUrl(it.coverImageUrl) },
                                    onOpen = { nav.playlist(it.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    TrackActionsHost(vm = vm, nav = nav, selected = actionTrack, onDismiss = { actionTrack = null })
}

@Composable
private fun LazyRowFilters(selected: SearchFilter, onSelect: (SearchFilter) -> Unit) {
    androidx.compose.foundation.lazy.LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(bottom = 8.dp)
    ) {
        items(SearchFilter.entries.toList()) { entry ->
            MusicyChip(entry.label, entry == selected, { onSelect(entry) })
        }
    }
}

/** The genre grid the web app shows on an empty search — Musicy's "categories". */
@Composable
private fun BrowseCategories(
    vm: MusicyViewModel,
    nav: Nav,
    home: Async<app.serika.musicy.mobile.ui.viewmodel.HomeState>
) {
    val genres = home.valueOrNull?.genres.orEmpty()
    if (genres.isEmpty()) {
        EmptyState(
            title = "Search Musicy",
            message = "Find songs, albums, artists and playlists across the library.",
            icon = Icons.Default.Search
        )
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
            Text(
                "Browse all",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        items(genres, key = { it.name }) { genre ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Brush.linearGradient(categoryColors(genre.name)))
                    .clickable { nav.genre(genre.name) }
                    .padding(12.dp)
            ) {
                Text(
                    genre.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "${genre.count} tracks",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.align(Alignment.BottomStart)
                )
            }
        }
    }
}
