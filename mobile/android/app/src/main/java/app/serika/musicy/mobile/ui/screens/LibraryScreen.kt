package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.ui.components.TrackItem
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel

@Composable
fun LibraryScreen(viewModel: AppViewModel) {
    var liked by remember { mutableStateOf<List<Track>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            liked = viewModel.api.getLikedSongs().tracks
        } catch (_: Exception) {
            liked = emptyList()
        } finally {
            loading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Your Library", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(16.dp))
        if (loading) {
            CircularProgressIndicator()
        } else if (liked.isEmpty()) {
            Text(
                "No liked songs yet. Heart tracks from the Home or Search tab.",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(liked) { track ->
                    TrackItem(
                        track = track,
                        onClick = { viewModel.playTrack(track, liked) }
                    )
                }
            }
        }
    }
}
