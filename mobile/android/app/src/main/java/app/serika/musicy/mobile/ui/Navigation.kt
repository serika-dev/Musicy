package app.serika.musicy.mobile.ui

import androidx.navigation.NavHostController

/** Every route the app can show. Kept in one place so deep links stay honest. */
object Routes {
    const val HOME = "home"
    const val SEARCH = "search"
    const val LIBRARY = "library"
    const val PROFILE = "profile"
    const val SETTINGS = "settings"
    const val PLAYER = "player"
    const val LIKED = "liked"
    const val DOWNLOADS = "downloads"

    const val ALBUM = "album/{id}"
    const val ARTIST = "artist/{id}"
    const val ARTIST_TRACKS = "artist/{id}/tracks"
    const val PLAYLIST = "playlist/{id}"
    const val MIX = "mix/{id}"
    const val GENRE = "genre/{name}"
    const val COLLECTION = "collection/{kind}"

    fun album(id: String) = "album/$id"
    fun artist(id: String) = "artist/$id"
    fun artistTracks(id: String) = "artist/$id/tracks"
    fun playlist(id: String) = "playlist/$id"
    fun mix(id: String) = "mix/$id"
    fun genre(name: String) = "genre/${java.net.URLEncoder.encode(name, "UTF-8")}"
    fun collection(kind: String) = "collection/$kind"
}

/** The "see all" pages, matching the web app's index routes. */
object CollectionKind {
    const val ALBUMS = "albums"
    const val ARTISTS = "artists"
    const val PLAYLISTS = "playlists"
    const val MIXES = "mixes"
    const val TRACKS = "tracks"
    const val RECENT = "recent"
    const val FOLLOWED = "followed"
    const val NEW_RELEASES = "new-releases"
    const val GENRES = "genres"
}

/**
 * Navigation callbacks bundled up so screens take one parameter instead of a
 * dozen lambdas.
 */
class Nav(private val controller: NavHostController) {
    fun album(id: String) = controller.navigate(Routes.album(id))
    fun artist(id: String) = controller.navigate(Routes.artist(id))
    fun artistTracks(id: String) = controller.navigate(Routes.artistTracks(id))
    fun playlist(id: String) = controller.navigate(Routes.playlist(id))
    fun mix(id: String) = controller.navigate(Routes.mix(id))
    fun genre(name: String) = controller.navigate(Routes.genre(name))
    fun collection(kind: String) = controller.navigate(Routes.collection(kind))
    fun liked() = controller.navigate(Routes.LIKED)
    fun downloads() = controller.navigate(Routes.DOWNLOADS)
    fun player() = controller.navigate(Routes.PLAYER)
    fun settings() = controller.navigate(Routes.SETTINGS)
    fun profile() = controller.navigate(Routes.PROFILE)
    fun search() = controller.navigate(Routes.SEARCH)
    fun back() {
        controller.popBackStack()
    }
}
