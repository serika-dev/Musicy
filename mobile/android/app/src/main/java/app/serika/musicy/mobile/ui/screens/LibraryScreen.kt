package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.components.TrackItem
import app.serika.musicy.mobile.ui.theme.*
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel

@Composable
fun LibraryScreen(viewModel: AppViewModel) {
    var liked by remember { mutableStateOf<List<Track>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            liked = viewModel.api.getLikedSongs().tracks
        } catch (e: Exception) {
            error = e.localizedMessage ?: "Could not load liked songs"
        } finally {
            loading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(16.dp)
    ) {
        Text("Your Library", style = MaterialTheme.typography.headlineMedium, color = OnBackground)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Liked songs and saved playlists",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceVariant
        )
        Spacer(modifier = Modifier.height(20.dp))

        when {
            loading -> {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            }
            error != null -> {
                Text(error ?: "Unknown error", color = Error)
            }
            liked.isEmpty() -> {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(
                        "No liked songs yet. Heart tracks from the Home or Search tab.",
                        color = OnSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(liked) { track ->
                        TrackItem(track = track) { viewModel.playTrack(track, liked) }
                    }
                }
            }
        }
    }
}
