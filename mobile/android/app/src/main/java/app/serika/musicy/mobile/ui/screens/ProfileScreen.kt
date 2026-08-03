package app.serika.musicy.mobile.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.ui.CollectionKind
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.Artwork
import app.serika.musicy.mobile.ui.components.MusicyDivider
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel

@Composable
fun ProfileScreen(vm: MusicyViewModel, nav: Nav) {
    val profile by vm.profile.collectAsState()
    val library by vm.library.collectAsState()
    val config by vm.config.collectAsState()
    val context = LocalContext.current
    val baseUrl = ApiClient.normalizedBaseUrl(config)

    fun openWeb(path: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, "$baseUrl$path".toUri()))
        }
    }

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(Primary.copy(alpha = 0.32f), Color.Transparent)))
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Artwork(
                    url = vm.repo.resolveUrl(profile?.avatarUrl),
                    contentDescription = profile?.label,
                    icon = Icons.Default.Person,
                    shape = CircleShape,
                    modifier = Modifier.size(96.dp)
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    profile?.label ?: config.userName ?: "Your account",
                    style = MaterialTheme.typography.headlineMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                profile?.email?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
                }
                if (profile?.role == "ADMIN") {
                    Spacer(Modifier.height(6.dp))
                    AssistChip(onClick = { openWeb("/admin") }, label = { Text("Admin") })
                }
            }
        }

        item {
            val data = library.valueOrNull
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard("Liked", data?.likedSongs?.size ?: 0, Icons.Default.Favorite, Modifier.weight(1f)) { nav.liked() }
                StatCard("Playlists", data?.playlists?.size ?: 0, Icons.Default.QueueMusic, Modifier.weight(1f)) {
                    nav.collection(CollectionKind.PLAYLISTS)
                }
                StatCard("Following", data?.followedArtists?.size ?: 0, Icons.Default.People, Modifier.weight(1f)) {
                    nav.collection(CollectionKind.FOLLOWED)
                }
            }
        }

        item { MusicyDivider(Modifier.padding(vertical = 16.dp)) }

        item { ProfileRow("Settings", Icons.Default.Settings) { nav.settings() } }
        item { ProfileRow("Your albums", Icons.Default.Album) { nav.collection(CollectionKind.ALBUMS) } }
        item { ProfileRow("Followed artists", Icons.Default.People) { nav.collection(CollectionKind.FOLLOWED) } }

        item { MusicyDivider(Modifier.padding(vertical = 16.dp)) }

        // The web app's informational pages don't need native reimplementations;
        // they open in the browser against the configured server.
        item { ProfileRow("About Musicy", Icons.Default.Info, external = true) { openWeb("/about") } }
        item { ProfileRow("Support", Icons.Default.SupportAgent, external = true) { openWeb("/support") } }
        item { ProfileRow("Contact", Icons.Default.Description, external = true) { openWeb("/contact") } }
        item { ProfileRow("Privacy policy", Icons.Default.PrivacyTip, external = true) { openWeb("/privacy") } }
        item { ProfileRow("Terms", Icons.Default.Description, external = true) { openWeb("/terms") } }
        item { ProfileRow("Developers", Icons.Default.Description, external = true) { openWeb("/developers") } }

        item { MusicyDivider(Modifier.padding(vertical = 16.dp)) }

        item {
            ProfileRow("Sign out", Icons.AutoMirrored.Filled.Logout, tint = MaterialTheme.colorScheme.error) {
                vm.signOut()
            }
        }

        item {
            Text(
                "Connected to $baseUrl",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
            )
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: Int,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceVariant)
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(6.dp))
        Text("$value", style = MaterialTheme.typography.titleMedium)
        Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
    }
}

@Composable
private fun ProfileRow(
    label: String,
    icon: ImageVector,
    external: Boolean = false,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(16.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge, color = tint, modifier = Modifier.weight(1f))
        if (external) {
            Icon(Icons.Default.OpenInNew, contentDescription = null, tint = OnSurfaceVariant, modifier = Modifier.size(16.dp))
        }
    }
}
