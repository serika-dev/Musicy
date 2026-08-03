package app.serika.musicy.mobile.ui

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
import app.serika.musicy.mobile.ui.screens.*
import app.serika.musicy.mobile.ui.theme.MusicyTheme
import app.serika.musicy.mobile.ui.theme.OnSurfaceVariant
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant
import app.serika.musicy.mobile.ui.viewmodel.MusicyViewModel
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
    val liked by vm.likedTrackIds.collectAsState()
    val toast by vm.toast.collectAsState()
    val profile by vm.profile.collectAsState()
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
                    MiniPlayer(
                        state = playback,
                        isLiked = playback.currentTrack?.id?.let { it in liked } == true,
                        artworkUrl = vm.repo.resolveUrl(playback.currentTrack?.artworkUrl),
                        onOpen = { nav.player() },
                        onTogglePlay = {
                            if (vm.isRemoteControlling) vm.sendRemoteCommand("toggle") else vm.player.togglePlayPause()
                        },
                        onNext = { if (vm.isRemoteControlling) vm.sendRemoteCommand("next") else vm.player.next() },
                        onToggleLike = { playback.currentTrack?.let { vm.toggleLike(it) } }
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
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
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
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(padding)
        ) {
            composable(Routes.HOME) {
                HomeScreen(vm, nav, profile?.label ?: config.userName ?: "there")
            }
            composable(Routes.SEARCH) { SearchScreen(vm, nav) }
            composable(Routes.LIBRARY) { LibraryScreen(vm, nav) }
            composable(Routes.PROFILE) { ProfileScreen(vm, nav) }
            composable(Routes.SETTINGS) { SettingsScreen(vm, nav) }
            composable(Routes.PLAYER) { PlayerScreen(vm, nav) }
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
