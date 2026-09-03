package app.serika.musicy.mobile.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.Settings as AndroidSettings
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.CrashReporter
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.player.SleepTimerState
import app.serika.musicy.mobile.ui.Nav
import app.serika.musicy.mobile.ui.components.BackButton
import app.serika.musicy.mobile.ui.components.MusicyChip
import app.serika.musicy.mobile.ui.components.MusicyDivider
import app.serika.musicy.mobile.ui.components.SleepTimerSheet
import app.serika.musicy.mobile.ui.components.formatDurationMs
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel

private const val ANDROID_AUTO_PACKAGE = "com.google.android.projection.gearhead"

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
    val recents by vm.recentSearches.collectAsState()
    val sleepRemaining by SleepTimerState.remainingMs.collectAsState()
    val sleepEndOfTrack by SleepTimerState.endOfTrack.collectAsState()
    val context = LocalContext.current

    var editingName by remember { mutableStateOf(false) }
    var draftName by remember(settings.deviceName) { mutableStateOf(settings.deviceName) }
    var showAutoHelp by remember { mutableStateOf(false) }
    var showReset by remember { mutableStateOf(false) }
    var showSleep by remember { mutableStateOf(false) }
    var showDiagnostics by remember { mutableStateOf(false) }

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

            // -- Android Auto ---------------------------------------------------
            item { SettingsHeader("Android Auto") }
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showAutoHelp = true }
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Set up Android Auto", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "Musicy not showing in your car? Tap for the exact steps.",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant
                        )
                    }
                }
            }

            // -- Connect --------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Musicy Connect") }
            item {
                SettingsToggle(
                    "Sync with my other devices",
                    "Show this phone in the device picker and let the web app hand playback over.",
                    settings.syncEnabled,
                    vm::setSyncEnabled
                )
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
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
                        Text(if (connected) "Connected" else "Not connected", style = MaterialTheme.typography.bodyLarge)
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
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
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
                    SettingsRow("Device name", settings.deviceName) { editingName = true }
                }
            }

            // -- Playback -------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Listening mode") }
            item {
                val mode = when {
                    settings.offlineOnly -> "offline"
                    settings.dataSaver -> "data_saver"
                    settings.audioQuality == "lossless" -> "lossless"
                    settings.audioQuality == "high" -> "high"
                    else -> "auto"
                }
                ChoiceRow(
                    title = "Playback",
                    options = listOf(
                        "Data saver" to "data_saver",
                        "Auto" to "auto",
                        "High" to "high",
                        "Lossless" to "lossless",
                        "Offline" to "offline"
                    ),
                    selected = mode,
                    onSelect = vm::setPlaybackMode
                )
            }
            item {
                Text(
                    when {
                        settings.offlineOnly -> "Only downloaded tracks play. The rest of the app uses your saved library."
                        settings.dataSaver -> "Streams the smallest files and skips extra artwork on mobile data."
                        settings.audioQuality == "lossless" -> "Streams and downloads original FLAC when the server has it."
                        settings.audioQuality == "high" -> "High-bitrate audio. Uses more data than Auto."
                        else -> "Picks a sensible stream for your connection. Downloads still follow this quality."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
                )
            }

            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Playback") }
            item {
                SettingsToggle(
                    "Autoplay recommendations",
                    "Keep playing similar tracks when the queue runs out.",
                    settings.autoplayRecommendations,
                    vm::setAutoplay
                )
            }
            item {
                SettingsToggle(
                    "Gapless playback",
                    "Preload the next track so albums run without a pause.",
                    settings.gaplessPlayback,
                    vm::setGapless
                )
            }
            item {
                SettingsToggle(
                    "Skip silence",
                    "Trim silent stretches at the start and end of a track.",
                    settings.skipSilence,
                    vm::setSkipSilence
                )
            }
            item {
                SettingsToggle(
                    "Normalize volume",
                    "Even out loudness differences between tracks.",
                    settings.normalizeVolume,
                    vm::setNormalizeVolume
                )
            }
            item {
                SettingsToggle(
                    "Resume where I left off",
                    "Restore the last queue when the app opens.",
                    settings.resumeOnLaunch,
                    vm::setResumeOnLaunch
                )
            }
            item {
                ChoiceRow(
                    title = "Playback speed",
                    options = listOf("0.75×" to 0.75f, "1×" to 1f, "1.25×" to 1.25f, "1.5×" to 1.5f, "2×" to 2f),
                    selected = settings.playbackSpeed,
                    onSelect = vm::setPlaybackSpeed
                )
            }
            item {
                ChoiceRow(
                    title = "Skip button jump",
                    options = listOf("5s" to 5, "10s" to 10, "15s" to 15, "30s" to 30),
                    selected = settings.seekStepSeconds,
                    onSelect = vm::setSeekStep
                )
            }
            item {
                ChoiceRow(
                    title = "Download quality",
                    options = listOf("Auto" to "auto", "Low" to "low", "High" to "high", "Lossless" to "lossless"),
                    selected = settings.audioQuality,
                    onSelect = vm::setAudioQuality
                )
            }
            item {
                SliderRow(
                    title = "Default volume",
                    value = settings.defaultVolume,
                    onChange = vm::setDefaultVolume
                )
            }
            item {
                SettingsRow(
                    "Equaliser",
                    "Open your phone's own equaliser for Musicy's audio."
                ) { vm.openEqualizer() }
            }
            item {
                SettingsRow(
                    "Sleep timer",
                    sleepRemaining?.let { "Pausing in ${formatDurationMs(it)}" }
                        ?: if (sleepEndOfTrack) "Pausing after this track" else "Off"
                ) { showSleep = true }
            }

            // -- Lyrics ---------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Lyrics") }
            item {
                SettingsToggle(
                    "Prefer synced lyrics",
                    "Scroll line by line when a synced version exists.",
                    settings.preferSyncedLyrics,
                    vm::setPreferSyncedLyrics
                )
            }
            item {
                SettingsToggle(
                    "Romanize lyrics",
                    "Convert Japanese, Korean and Hindi lyrics to the Latin alphabet.",
                    settings.autoRomanizeLyrics,
                    vm::setAutoRomanize
                )
            }
            if (settings.autoRomanizeLyrics) {
                item {
                    SettingsToggle(
                        "Show original alongside",
                        "Keep the original script above the romanized line.",
                        settings.showRomanizationAlongside,
                        vm::setRomanizeAlongside
                    )
                }
                item {
                    ChoiceRow(
                        title = "Romanize language",
                        options = listOf("Auto" to "auto", "Japanese" to "ja", "Korean" to "ko", "Hindi" to "hi"),
                        selected = settings.romanizeLanguage,
                        onSelect = vm::setRomanizeLanguage
                    )
                }
            }

            // -- Privacy --------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Privacy") }
            item {
                SettingsToggle(
                    "Private session",
                    "Don't record what you play to your listening history.",
                    settings.privateSession,
                    vm::setPrivateSession
                )
            }
            item {
                SettingsToggle(
                    "Allow scrobbling",
                    "Share plays with connected scrobbling services.",
                    settings.allowScrobbling,
                    vm::setAllowScrobbling
                )
            }

            // -- Appearance -----------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Appearance & feedback") }
            item {
                SettingsToggle(
                    "Reduced motion",
                    "Cut animations, including the lyric auto-scroll.",
                    settings.reducedMotion,
                    vm::setReducedMotion
                )
            }
            item {
                SettingsToggle(
                    "Haptic feedback",
                    "Vibrate briefly when you tap a playback control.",
                    settings.hapticFeedback,
                    vm::setHapticFeedback
                )
            }
            item {
                SettingsRow(
                    "Clear recent searches",
                    if (recents.isEmpty()) "Nothing saved" else "${recents.size} saved on this phone"
                ) { vm.clearSearchHistory() }
            }

            // -- Storage --------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Storage & offline") }
            item {
                SettingsToggle(
                    "Offline mode",
                    "Don't stream. Play downloads and browse the saved library only.",
                    settings.offlineOnly,
                    vm::setOfflineOnly
                )
            }
            item {
                SettingsToggle(
                    "Data saver",
                    "Use the smallest streams and skip extra images on cellular.",
                    settings.dataSaver,
                    vm::setDataSaver
                )
            }
            item {
                SettingsToggle(
                    "Stream on mobile data",
                    "Turn off to only stream on Wi-Fi. Downloads still play anywhere.",
                    settings.streamOnCellular,
                    vm::setStreamOnCellular
                )
            }
            item {
                SettingsToggle(
                    "Download on Wi-Fi only",
                    "Hold downloads until you're off mobile data.",
                    settings.downloadOnWifiOnly,
                    vm::setDownloadOnWifiOnly
                )
            }
            item {
                SettingsRow(
                    "Downloads",
                    "${downloads.size} tracks · ${formatBytes(downloads.sumOf { it.sizeBytes })}"
                ) { nav.downloads() }
            }
            item {
                SettingsRow(
                    "Save library for offline",
                    "Download metadata so Home, playlists, liked songs and artists work without Wi-Fi."
                ) { vm.syncLibraryOffline() }
            }

            // -- Account --------------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Account") }
            item { SettingsRow("Server", ApiClient.normalizedBaseUrl(config)) {} }
            item { SettingsRow("Signed in as", config.userName ?: "Unknown") {} }
            item {
                Text(
                    "Playback, lyrics and privacy settings are saved to your account, so they " +
                        "follow you to the web app and survive reinstalling Musicy.",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
            }
            item {
                Row(modifier = Modifier.padding(20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = { showReset = true }) { Text("Reset settings") }
                    OutlinedButton(onClick = { vm.signOut() }) { Text("Sign out") }
                }
            }

            // -- diagnostics -------------------------------------------------
            item { MusicyDivider(Modifier.padding(vertical = 8.dp)) }
            item { SettingsHeader("Diagnostics") }
            item {
                val reports = remember { CrashReporter.reports(context) }
                SettingsRow(
                    "Crash reports",
                    if (reports.isEmpty()) "No crashes recorded on this device."
                    else "${reports.size} recorded · latest ${reports.first().name.removePrefix("crash-").removeSuffix(".txt")}",
                    onClick = { if (reports.isNotEmpty()) showDiagnostics = true }
                )
            }
        }
    }

    if (showSleep) {
        SleepTimerSheet(
            remainingMs = sleepRemaining,
            endOfTrack = sleepEndOfTrack,
            onDismiss = { showSleep = false },
            onSelectMinutes = {
                vm.player.setSleepTimer(it)
                vm.showToast("Pausing in $it minutes")
            },
            onEndOfTrack = {
                vm.player.sleepAtEndOfTrack()
                vm.showToast("Pausing after this track")
            },
            onCancel = {
                vm.player.cancelSleepTimer()
                vm.showToast("Sleep timer off")
            }
        )
    }

    if (showAutoHelp) {
        AndroidAutoHelpDialog(
            onDismiss = { showAutoHelp = false },
            onOpenAuto = {
                // Android Auto lives in different places per OEM — on Samsung
                // it is not under Connected devices at all — so jump straight
                // to its own settings instead of describing a path.
                val launch = context.packageManager.getLaunchIntentForPackage(ANDROID_AUTO_PACKAGE)
                val intent = launch ?: Intent(
                    AndroidSettings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$ANDROID_AUTO_PACKAGE")
                )
                val opened = runCatching {
                    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }.isSuccess
                if (!opened) vm.showToast("Couldn't open Android Auto settings")
                showAutoHelp = false
            }
        )
    }

    if (showDiagnostics) {
        val reports = remember { CrashReporter.reports(context) }
        var selected by remember { mutableStateOf(reports.firstOrNull()) }
        AlertDialog(
            onDismissRequest = { showDiagnostics = false },
            title = { Text("Crash reports") },
            text = {
                Column {
                    if (reports.size > 1) {
                        Row(
                            modifier = Modifier
                                .padding(bottom = 8.dp)
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            reports.forEach { file ->
                                MusicyChip(
                                    label = file.name.removePrefix("crash-").removeSuffix(".txt"),
                                    selected = file == selected,
                                    onClick = { selected = file }
                                )
                            }
                        }
                    }
                    Text(
                        selected?.readText() ?: "No report selected",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier
                            .heightIn(max = 360.dp)
                            .verticalScroll(rememberScrollState())
                    )
                }
            },
            confirmButton = {
                selected?.let { file ->
                    TextButton(onClick = {
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "Musicy ${file.name.removeSuffix(".txt")}")
                            putExtra(Intent.EXTRA_TEXT, file.readText())
                        }
                        runCatching {
                            context.startActivity(Intent.createChooser(send, "Share crash report"))
                        }
                    }) { Text("Share") }
                }
            },
            dismissButton = { TextButton(onClick = { showDiagnostics = false }) { Text("Close") } }
        )
    }

    if (showReset) {
        AlertDialog(
            onDismissRequest = { showReset = false },
            title = { Text("Reset settings?") },
            text = { Text("Everything goes back to defaults. Your downloads and sign-in are kept.") },
            confirmButton = {
                TextButton(onClick = {
                    vm.resetSettings()
                    showReset = false
                }) { Text("Reset") }
            },
            dismissButton = { TextButton(onClick = { showReset = false }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun AndroidAutoHelpDialog(onDismiss: () -> Unit, onOpenAuto: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Show Musicy in your car") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Android Auto hides apps that weren't installed from the Play Store until " +
                        "you allow unknown sources. On Samsung phones Android Auto is its own " +
                        "app rather than a page in Settings.",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant
                )
                Text("1. Open Android Auto settings (button below).", style = MaterialTheme.typography.bodyMedium)
                Text("2. Scroll to the bottom and tap Version ten times.", style = MaterialTheme.typography.bodyMedium)
                Text("3. Open the ⋮ menu → Developer settings.", style = MaterialTheme.typography.bodyMedium)
                Text("4. Turn on Unknown sources.", style = MaterialTheme.typography.bodyMedium)
                Text("5. Reconnect to the car — Musicy appears in the app list.", style = MaterialTheme.typography.bodyMedium)
                Text(
                    "Installing Musicy from the Play Store skips all of this.",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant
                )
            }
        },
        confirmButton = { TextButton(onClick = onOpenAuto) { Text("Open Android Auto") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
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
            .clickable { onChange(!checked) }
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

/** A labelled row of chips — used wherever a setting is one of a few values. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> ChoiceRow(
    title: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
        Text(title, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (label, value) ->
                MusicyChip(label, value == selected, { onSelect(value) })
            }
        }
    }
}

@Composable
private fun SliderRow(title: String, value: Float, onChange: (Float) -> Unit) {
    var local by remember(value) { mutableStateOf(value) }
    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
        Row {
            Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            Text("${(local * 100).toInt()}%", style = MaterialTheme.typography.bodySmall, color = OnSurfaceVariant)
        }
        Slider(
            value = local,
            onValueChange = { local = it },
            onValueChangeFinished = { onChange(local) },
            colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary)
        )
    }
}

internal fun formatBytes(bytes: Long): String = when {
    bytes >= 1_073_741_824 -> "%.1f GB".format(bytes / 1_073_741_824.0)
    bytes >= 1_048_576 -> "%.0f MB".format(bytes / 1_048_576.0)
    bytes >= 1024 -> "%.0f KB".format(bytes / 1024.0)
    else -> "$bytes B"
}
