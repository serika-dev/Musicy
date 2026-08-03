package app.serika.musicy.mobile.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
import app.serika.musicy.mobile.ui.screens.SearchScreen
import app.serika.musicy.mobile.ui.screens.SetupScreen
import app.serika.musicy.mobile.ui.theme.MusicyTheme
import app.serika.musicy.mobile.ui.viewmodel.AppViewModel
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object Search : Screen("search", "Search", Icons.Default.Search)
    data object Library : Screen("library", "Library", Icons.Default.LibraryMusic)
    data object Player : Screen("player", "Now Playing", Icons.Default.LibraryMusic)
}

@Composable
fun MusicyApp() {
    MusicyTheme {
        val context = LocalContext.current
        val store = remember { ServerConfigStore(context) }
        val config by store.config.collectAsState(initial = app.serika.musicy.mobile.data.model.ServerConfig())
        val scope = rememberCoroutineScope()

        if (config.baseUrl.isBlank()) {
            SetupScreen(
                onSave = { url, key ->
                    scope.launch { store.save(url, key) }
                }
            )
        } else {
            val api = remember(config) { ApiClient.create(config) }
            MainScreen(api)
        }
    }
}

@Composable
fun MainScreen(api: app.serika.musicy.mobile.data.api.MusicyApi) {
    val navController = rememberNavController()
    val viewModel: AppViewModel = viewModel(factory = AppViewModel.Factory(api))
    val currentTrack = viewModel.currentTrack
    val isPlaying = viewModel.isPlaying

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = app.serika.musicy.mobile.ui.theme.Surface) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                listOf(Screen.Home, Screen.Search, Screen.Library).forEach { screen ->
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
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        val track = currentTrack
        Scaffold(
            modifier = Modifier.padding(innerPadding),
            bottomBar = {
                if (track != null) {
                    BottomPlayer(
                        track = track,
                        isPlaying = isPlaying,
                        onToggle = { viewModel.togglePlayPause() },
                        onOpen = { navController.navigate(Screen.Player.route) }
                    )
                }
            }
        ) { pad ->
            NavHost(
                navController = navController,
                startDestination = Screen.Home.route,
                modifier = Modifier.padding(pad)
            ) {
                composable(Screen.Home.route) { HomeScreen(viewModel) }
                composable(Screen.Search.route) { SearchScreen(viewModel) }
                composable(Screen.Library.route) { LibraryScreen(viewModel) }
                composable(Screen.Player.route) { PlayerScreen(viewModel) }
            }
        }
    }
}
