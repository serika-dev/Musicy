package app.serika.musicy.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.preferences.ServerConfigStore
import app.serika.musicy.mobile.ui.components.BottomPlayer
import app.serika.musicy.mobile.ui.screens.HomeScreen
import app.serika.musicy.mobile.ui.screens.LibraryScreen
import app.serika.musicy.mobile.ui.screens.PlayerScreen
import app.serika.musicy.mobile.ui.screens.ProfileScreen
import app.serika.musicy.mobile.ui.screens.SearchScreen
import app.serika.musicy.mobile.ui.screens.SetupScreen
import app.serika.musicy.mobile.ui.theme.*
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object Search : Screen("search", "Search", Icons.Default.Search)
    data object Library : Screen("library", "Library", Icons.Default.LibraryMusic)
    data object Profile : Screen("profile", "Profile", Icons.Default.Person)
    data object Player : Screen("player", "Now Playing", Icons.Default.LibraryMusic)
}

@Composable
fun MusicyApp() {
    MusicyTheme {
        val context = LocalContext.current
        val store = remember { ServerConfigStore(context) }
        val config by store.config.collectAsState(initial = app.serika.musicy.mobile.data.model.ServerConfig())
        val scope = rememberCoroutineScope()

        if (config.baseUrl.isBlank() || config.apiKey.isBlank()) {
            SetupScreen(
                onSave = { url, key, userName ->
                    scope.launch { store.save(url, key, userName) }
                }
            )
        } else {
            val api = remember(config) { ApiClient.create(config) }
            MainScreen(api, config.userName ?: "there") {
                scope.launch { store.clear() }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(api: app.serika.musicy.mobile.data.api.MusicyApi, userName: String, onLogout: () -> Unit) {
    val navController = rememberNavController()
    val viewModel: AppViewModel = viewModel(factory = AppViewModel.Factory(api))
    val track = viewModel.currentTrack
    val isPlaying = viewModel.isPlaying

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Surface),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "Musicy",
                                tint = Primary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Musicy", style = MaterialTheme.typography.titleLarge, color = OnBackground)
                    }
                },
                actions = {
                    Surface(
                        modifier = Modifier
                            .padding(end = 12.dp)
                            .clip(CircleShape)
                            .clickable { navController.navigate(Screen.Profile.route) },
                        color = SurfaceVariant
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(PrimaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = userName.take(1).uppercase(),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = OnPrimary
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = userName,
                                style = MaterialTheme.typography.labelMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                color = OnBackground
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background.copy(alpha = 0.85f),
                    titleContentColor = OnBackground
                )
            )
        },
        bottomBar = {
            Column {
                if (track != null) {
                    BottomPlayer(
                        track = track,
                        isPlaying = isPlaying,
                        onToggle = { viewModel.togglePlayPause() },
                        onOpen = { navController.navigate(Screen.Player.route) }
                    )
                }
                NavigationBar(containerColor = Surface) {
                    val navBackStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = navBackStackEntry?.destination
                    listOf(Screen.Home, Screen.Search, Screen.Library, Screen.Profile).forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.label) },
                            label = { Text(screen.label) },
                            selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Primary,
                                selectedTextColor = Primary,
                                indicatorColor = PrimaryContainer
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { HomeScreen(viewModel, userName) }
            composable(Screen.Search.route) { SearchScreen(viewModel) }
            composable(Screen.Library.route) { LibraryScreen(viewModel) }
            composable(Screen.Profile.route) { ProfileScreen(userName, onLogout) }
            composable(Screen.Player.route) { PlayerScreen(viewModel, onClose = { navController.popBackStack() }) }
        }
    }
}
