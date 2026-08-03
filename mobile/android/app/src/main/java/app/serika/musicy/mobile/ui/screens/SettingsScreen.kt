package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.BackButton
import app.serika.musicy.mobile.ui.components.MusicyDivider
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: MusicyViewModel, nav: Nav) {
    val settings by vm.settings.collectAsState()
    val config by vm.config.collectAsState()
    val devices by vm.syncDevices.collectAsState()
    val activeDeviceId by vm.syncActiveDeviceId.collectAsState()
    val thisDeviceId by vm.thisDeviceId.collectAsState()
    val connected by vm.syncConnected.collectAsState()
    val downloads by vm.repo.downloads.collectAsState(initial = emptyList())

    var editingName by remember { mutableStateOf(false) }
    var draftName by remember(settings.deviceName) { mutableStateOf(settings.deviceName) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = { BackButton(nav::back) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { padding ->
        LazyColumn(contentPadding = padding) {
            item { SettingsHeader("Musicy Connect") }
            item {
                SettingsToggle(
                    title = "Sync with my other devices",
                    subtitle = "Show this phone in the device picker and let the web app hand playback over.",
                    checked = settings.syncEnabled,
                    onChange = vm::setSyncEnabled
                )
            }
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Cast,
                        contentDescription = null,
                        tint = if (connected) Primary else OnSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            if (connected) "Connected" else "Not connected",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Text(
                            when {
                                !connected -> "Waiting for the sync stream."
                                activeDeviceId == thisDeviceId -> "This phone is the active device."
                                activeDeviceId != null ->
                                    "Playing on ${devices.firstOrNull { it.id == activeDeviceId }?.name ?: "another device"}."
                                else -> "${devices.size} device(s) online."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant
                        )
                    }
                    TextButton(onClick = { vm.claimPlaybackHere() }, enabled = connected) { Text("Play here") }
                }
            }
            item {
                if (editingName) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = draftName,
                            onValueChange = { draftName = it },
                            label = { Text("Device name") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(Modifier.width(8.dp))
                        TextButton(onClick = {
                            vm.setDeviceName(draftName)
                            editingName = false
                        }) { Text("Save") }
                    }
                } else {
                    SettingsRow(
                        title = "Device name",
                        subtitle = settings.deviceName,
                        onClick = { editingName = true }
                    )
                }
            }

            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Playback") }
            item {
                SettingsToggle(
                    title = "Autoplay recommendations",
                    subtitle = "Keep playing similar tracks when the queue runs out.",
                    checked = settings.autoplayRecommendations,
                    onChange = vm::setAutoplay
                )
            }
            item {
                SettingsToggle(
                    title = "Gapless playback",
                    subtitle = "Preload the next track so albums run without a pause.",
                    checked = settings.gaplessPlayback,
                    onChange = vm::setGapless
                )
            }
            item {
                SettingsToggle(
                    title = "Private session",
                    subtitle = "Don't record what you play to your listening history.",
                    checked = settings.privateSession,
                    onChange = vm::setPrivateSession
                )
            }

            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Lyrics") }
            item {
                SettingsToggle(
                    title = "Prefer synced lyrics",
                    subtitle = "Scroll lyrics line by line when a synced version exists.",
                    checked = settings.preferSyncedLyrics,
                    onChange = vm::setPreferSyncedLyrics
                )
            }

            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Storage") }
            item {
                SettingsRow(
                    title = "Downloads",
                    subtitle = "${downloads.size} tracks · ${formatBytes(downloads.sumOf { it.sizeBytes })}",
                    onClick = { nav.downloads() }
                )
            }

            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Account") }
            item {
                SettingsRow(
                    title = "Server",
                    subtitle = ApiClient.normalizedBaseUrl(config),
                    onClick = {}
                )
            }
            item {
                SettingsRow(
                    title = "Signed in as",
                    subtitle = config.userName ?: "Unknown",
                    onClick = {}
                )
            }
            item {
                Box(modifier = Modifier.padding(20.dp)) {
                    OutlinedButton(onClick = { vm.signOut() }) { Text("Sign out") }
                }
            }
        }
    }
}

@Composable
private fun SettingsHeader(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = Primary,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
    )
}

@Composable
private fun SettingsToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun SettingsRow(title: String, subtitle: String, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        Text(title, style = MaterialTheme.typography.bodyLarge)
        Text(
            subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

internal fun formatBytes(bytes: Long): String = when {
    bytes >= 1_073_741_824 -> "%.1f GB".format(bytes / 1_073_741_824.0)
    bytes >= 1_048_576 -> "%.0f MB".format(bytes / 1_048_576.0)
    bytes >= 1024 -> "%.0f KB".format(bytes / 1024.0)
    else -> "$bytes B"
}
