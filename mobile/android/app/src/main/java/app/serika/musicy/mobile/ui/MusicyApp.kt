package app.serika.musicy.mobile.ui

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.serika.musicy.mobile.data.MusicyRepository
import app.serika.musicy.mobile.data.model.ServerConfig
import app.serika.musicy.mobile.ui.components.Artwork
import app.serika.musicy.mobile.ui.components.MiniPlayer
import app.serika.musicy.mobile.ui.components.SelectModeBar
import app.serika.musicy.mobile.ui.components.rememberHapticClick
import app.serika.musicy.mobile.widget.WidgetActions
import app.serika.musicy.mobile.ui.screens.*
import app.serika.musicy.mobile.ui.theme.MusicyTheme
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
import coil.imageLoader
import coil.request.ImageRequest
import kotlinx.coroutines.launch

private sealed class Tab(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Tab(Routes.HOME, "Home", Icons.Default.Home)
    data object Search : Tab(Routes.SEARCH, "Search", Icons.Default.Search)
    data object Library : Tab(Routes.LIBRARY, "Library", Icons.Default.LibraryMusic)
    data object Profile : Tab(Routes.PROFILE, "Profile", Icons.Default.Person)
}

private val tabs = listOf(Tab.Home, Tab.Search, Tab.Library, Tab.Profile)

@Composable
fun MusicyApp() {
    MusicyTheme {
        val context = LocalContext.current
        val repo = remember { MusicyRepository.get(context) }
        val config by repo.config.collectAsState(initial = ServerConfig())
        val scope = rememberCoroutineScope()

        if (!config.isConfigured) {
            SetupScreen(onSave = { url, key, userName ->
                scope.launch { repo.serverConfigStore.save(url, key, userName) }
            })
        } else {
            MainScaffold(config = config)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(config: ServerConfig) {
    // Keyed on the server config so signing into a different instance rebuilds
    // the whole state tree instead of showing the previous account's data.
    val vm: MusicyViewModel = viewModel(key = "musicy-${config.baseUrl}-${config.apiKey.takeLast(6)}")
    val navController = rememberNavController()
    val nav = remember(navController) { Nav(navController) }

    val playback by vm.player.state.collectAsState()
    // Separate flow: the mini-player's progress bar is the only thing here
    // that needs to redraw on the position tick.
    val progress by vm.player.position.collectAsState()
    val liked by vm.likedTrackIds.collectAsState()
    val settings by vm.settings.collectAsState()
    val haptics = settings.hapticFeedback
    val toast by vm.toast.collectAsState()
    val profile by vm.profile.collectAsState()
    val selecting by vm.selecting.collectAsState()
    val selectedIds by vm.selectedIds.collectAsState()
    val snackbarHost = remember { SnackbarHostState() }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val isPlayerRoute = currentRoute == Routes.PLAYER
    val isTabRoute = tabs.any { it.route == currentRoute }

    LaunchedEffect(toast) {
        toast?.let {
            snackbarHost.showSnackbar(it)
            vm.consumeToast()
        }
    }

    val widgetAction by WidgetActions.pending.collectAsState()
    LaunchedEffect(widgetAction) {
        val action = widgetAction ?: return@LaunchedEffect
        vm.handleWidgetAction(action)
        WidgetActions.consume()
    }

    // Warm the next couple of covers into the image cache so skipping forward
    // shows art immediately instead of a placeholder that fills in a beat late.
    val context = LocalContext.current
    LaunchedEffect(playback.currentIndex, playback.queue.size) {
        playback.queue.drop(playback.currentIndex + 1).take(2).forEach { track ->
            vm.repo.resolveUrl(track.artworkUrl)?.let { url ->
                context.imageLoader.enqueue(ImageRequest.Builder(context).data(url).build())
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHost) },
        topBar = {
            if (isTabRoute) {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(9.dp))
                                    .background(Primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.MusicNote,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Text("Musicy", style = MaterialTheme.typography.titleLarge)
                        }
                    },
                    actions = {
                        // The app caches aggressively; this is how you tell it
                        // to go and look again.
                        IconButton(onClick = rememberHapticClick(haptics) { vm.refreshAll() }) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = OnSurfaceVariant
                            )
                        }
                        Row(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .clip(CircleShape)
                                .background(SurfaceVariant)
                                .clickable { nav.profile() }
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Artwork(
                                url = vm.repo.resolveUrl(profile?.avatarUrl),
                                contentDescription = null,
                                shape = CircleShape,
                                icon = Icons.Default.Person,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = profile?.label ?: config.userName ?: "You",
                                style = MaterialTheme.typography.labelMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background
                    )
                )
            }
        },
        bottomBar = {
            if (!isPlayerRoute) {
                Column {
                    val network by vm.network.collectAsState()
                    val offlineLocked = settings.offlineOnly || !network.online
                    if (offlineLocked) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (settings.offlineOnly) Primary.copy(alpha = 0.18f) else SurfaceVariant)
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                if (settings.offlineOnly) "Offline mode — playing downloads only"
                                else "You're offline — browsing saved library",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (settings.offlineOnly) Primary else OnSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                    if (selecting) {
                        SelectModeBar(
                            count = selectedIds.size,
                            onDownload = { vm.downloadSelected() },
                            onCancel = { vm.exitSelectMode() }
                        )
                    }
                    MiniPlayer(
                        state = playback,
                        progress = progress.progress,
                        isLiked = playback.currentTrack?.id?.let { it in liked } == true,
                        artworkUrl = vm.repo.resolveUrl(playback.currentTrack?.artworkUrl),
                        onOpen = { nav.player() },
                        onTogglePlay = rememberHapticClick(haptics) {
                            if (vm.isRemoteControlling) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause()
                        },
                        onNext = rememberHapticClick(haptics) {
                            if (vm.isRemoteControlling) vm.sendRemoteCommand("next") else vm.player.next()
                        },
                        onPrevious = rememberHapticClick(haptics) {
                            if (vm.isRemoteControlling) vm.sendRemoteCommand("previous") else vm.player.previous()
                        },
                        onToggleLike = rememberHapticClick(haptics) {
                            playback.currentTrack?.let { vm.toggleLike(it) }
                        },
                        animate = !settings.reducedMotion
                    )
                    Spacer(Modifier.height(6.dp))
                    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                        tabs.forEach { tab ->
                            val selected = backStackEntry?.destination?.hierarchy?.any { it.route == tab.route } == true
                            NavigationBarItem(
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                                selected = selected,
                                onClick = {
                                    // Land on the tab's own root every time. The
                                    // previous saveState/restoreState pair brought
                                    // back whatever detail screen you had drilled
                                    // into, so tapping Home showed an album instead
                                    // of Home. Popping to the start destination and
                                    // not restoring clears anything stacked on top.
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = false
                                        }
                                        launchSingleTop = true
                                        restoreState = false
                                    }
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Primary,
                                    selectedTextColor = Primary,
                                    unselectedIconColor = OnSurfaceVariant,
                                    unselectedTextColor = OnSurfaceVariant,
                                    indicatorColor = MaterialTheme.colorScheme.primaryContainer
                                )
                            )
                        }
                    }
                }
            }
        }
    ) { padding ->
        // Reduced motion collapses everything to a quick fade; otherwise a
        // gentle fade-and-scale on push and a slide-up for the player give the
        // app the same considered feel as the web UI.
        val motion = if (settings.reducedMotion) 90 else 300
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(padding),
            enterTransition = { fadeIn(tween(motion)) + scaleIn(tween(motion), initialScale = 0.98f) },
            exitTransition = { fadeOut(tween(motion)) },
            popEnterTransition = { fadeIn(tween(motion)) },
            popExitTransition = { fadeOut(tween(motion)) + scaleOut(tween(motion), targetScale = 0.98f) }
        ) {
            composable(Routes.HOME) {
                HomeScreen(vm, nav, profile?.label ?: config.userName ?: "there")
            }
            composable(Routes.SEARCH) { SearchScreen(vm, nav) }
            composable(Routes.LIBRARY) { LibraryScreen(vm, nav) }
            composable(Routes.PROFILE) { ProfileScreen(vm, nav) }
            composable(Routes.SETTINGS) { SettingsScreen(vm, nav) }
            composable(
                Routes.PLAYER,
                // The player rises from the bottom and drops back down, the way
                // a now-playing sheet should.
                enterTransition = { slideInVertically(tween(motion)) { it } + fadeIn(tween(motion)) },
                popExitTransition = { slideOutVertically(tween(motion)) { it } + fadeOut(tween(motion)) }
            ) { PlayerScreen(vm, nav) }
            composable(Routes.LIKED) { LikedSongsScreen(vm, nav) }
            composable(Routes.DOWNLOADS) { DownloadsScreen(vm, nav) }

            composable(
                route = Routes.ALBUM,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                AlbumScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.ARTIST,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                ArtistScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.ARTIST_TRACKS,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                ArtistTracksScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.ARTIST_ALBUMS,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                ArtistAlbumsScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.PLAYLIST,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                PlaylistScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.MIX,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { entry ->
                DailyMixScreen(vm, nav, entry.arguments?.getString("id").orEmpty())
            }
            composable(
                route = Routes.GENRE,
                arguments = listOf(navArgument("name") { type = NavType.StringType })
            ) { entry ->
                val encoded = entry.arguments?.getString("name").orEmpty()
                GenreScreen(vm, nav, java.net.URLDecoder.decode(encoded, "UTF-8"))
            }
            composable(
                route = Routes.COLLECTION,
                arguments = listOf(navArgument("kind") { type = NavType.StringType })
            ) { entry ->
                CollectionScreen(vm, nav, entry.arguments?.getString("kind").orEmpty())
            }
        }
    }
}
