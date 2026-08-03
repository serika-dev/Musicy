package app.serika.musicy.mobile.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ServerConfig(
    val baseUrl: String = "",
    val apiKey: String = "",
    val userName: String? = null
) {
    val isConfigured: Boolean get() = baseUrl.isNotBlank() && apiKey.isNotBlank()
}

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val username: String,
    val displayName: String
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class AuthResponse(
    val message: String? = null,
    val apiKey: String? = null,
    val user: User? = null
)

@Serializable
data class User(
    val id: String,
    val email: String? = null,
    val username: String? = null,
    val displayName: String? = null,
    val avatarUrl: String? = null,
    val bannerUrl: String? = null,
    val role: String? = null,
    val isPremium: Boolean? = null,
    @SerialName("_count") val count: Count? = null
) {
    val label: String get() = displayName ?: username ?: email?.substringBefore('@') ?: "You"
}

@Serializable
data class Track(
    val id: String,
    val title: String,
    val duration: Int? = null,
    val coverImageUrl: String? = null,
    val filePath: String? = null,
    val format: String? = null,
    val genre: String? = null,
    val bitRate: Int? = null,
    val sampleRate: Int? = null,
    val playCount: Int? = null,
    val trackNumber: Int? = null,
    val createdAt: String? = null,
    val artist: Artist? = null,
    val album: Album? = null,
    val featuredArtists: List<Artist>? = null
) {
    /** Cover art, preferring the track's own art over the album's. */
    val artworkUrl: String? get() = coverImageUrl ?: album?.coverImageUrl ?: artist?.imageUrl

    /** "Artist, Feature A & Feature B", matching how the web app credits a track. */
    val artistLine: String
        get() {
            val names = buildList {
                artist?.name?.let { add(it) }
                featuredArtists?.forEach { add(it.name) }
            }
            return when (names.size) {
                0 -> "Unknown artist"
                1 -> names[0]
                else -> names.dropLast(1).joinToString(", ") + " & " + names.last()
            }
        }
}

@Serializable
data class Artist(
    val id: String,
    val name: String,
    val imageUrl: String? = null,
    val bannerUrl: String? = null,
    val verified: Boolean? = null,
    val bio: String? = null,
    val isCollab: Boolean? = null,
    val isFollowing: Boolean? = null,
    val genres: List<String>? = null,
    val members: List<Artist>? = null,
    val topTracks: List<Track>? = null,
    val albums: List<Album>? = null,
    @SerialName("_count") val count: Count? = null
)

@Serializable
data class Album(
    val id: String,
    val title: String,
    val coverImageUrl: String? = null,
    val releaseDate: String? = null,
    val genre: String? = null,
    val albumType: String? = null,
    val description: String? = null,
    val artist: Artist? = null,
    val tracks: List<Track>? = null,
    @SerialName("_count") val count: Count? = null
) {
    val trackCount: Int get() = tracks?.size ?: count?.tracks ?: 0
    val year: String? get() = releaseDate?.take(4)?.takeIf { it.length == 4 }
}

@Serializable
data class Count(
    val tracks: Int? = null,
    val albums: Int? = null,
    val followers: Int? = null,
    val playlists: Int? = null,
    val likes: Int? = null
)

@Serializable
data class Playlist(
    val id: String,
    val name: String,
    val description: String? = null,
    val coverImageUrl: String? = null,
    val isPublic: Boolean? = null,
    val createdAt: String? = null,
    val owner: User? = null,
    val tracks: List<PlaylistTrack>? = null,
    @SerialName("_count") val count: Count? = null
) {
    val trackCount: Int get() = tracks?.size ?: count?.tracks ?: 0
    fun trackList(): List<Track> = tracks.orEmpty().map { it.track }
}

@Serializable
data class PlaylistTrack(
    val id: String? = null,
    val position: Int? = null,
    val track: Track
)

@Serializable
data class DailyMix(
    val id: String,
    val name: String,
    val description: String? = null,
    val coverImageUrl: String? = null,
    val genre: String? = null,
    val tracks: List<Track>? = null,
    @SerialName("_count") val count: Count? = null
) {
    val trackCount: Int get() = tracks?.size ?: count?.tracks ?: 0
}

@Serializable
data class Genre(
    val name: String,
    val count: Int = 0
)

@Serializable
data class GenresResponse(
    val genres: List<Genre> = emptyList()
)

@Serializable
data class AlbumsResponse(
    val albums: List<Album> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false
)

@Serializable
data class ArtistsResponse(
    val artists: List<Artist> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false
)

@Serializable
data class TracksResponse(
    val tracks: List<Track> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false
)

@Serializable
data class PlaylistsResponse(
    val playlists: List<Playlist> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false
)

@Serializable
data class SearchResponse(
    val tracks: Paged<Track>? = null,
    val albums: Paged<Album>? = null,
    val artists: Paged<Artist>? = null,
    val playlists: Paged<Playlist>? = null
) {
    val isEmpty: Boolean
        get() = tracks?.items.isNullOrEmpty() &&
            albums?.items.isNullOrEmpty() &&
            artists?.items.isNullOrEmpty() &&
            playlists?.items.isNullOrEmpty()
}

@Serializable
data class Paged<T>(
    val items: List<T> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0
)

@Serializable
data class PublicSettingsResponse(
    val settings: Map<String, String> = emptyMap()
)

@Serializable
data class PlayRequest(
    val trackId: String,
    val duration: Int? = null,
    val context: PlayContext? = null
)

@Serializable
data class PlayContext(
    val type: String,
    val id: String? = null,
    val name: String? = null
)

@Serializable
data class LikeRequest(val trackId: String)

@Serializable
data class CreatePlaylistRequest(
    val name: String,
    val description: String? = null,
    val isPublic: Boolean = true
)

@Serializable
data class PlaylistTracksRequest(val trackIds: List<String>)

@Serializable
data class LyricsResponse(
    val lrcId: Int? = null,
    val plainLyrics: String? = null,
    val syncedLyrics: String? = null
) {
    val hasAnything: Boolean get() = !plainLyrics.isNullOrBlank() || !syncedLyrics.isNullOrBlank()
}

@Serializable
data class LikedSongsResponse(
    val tracks: List<Track> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false
)

@Serializable
data class RecentlyPlayedResponse(
    val tracks: List<Track> = emptyList()
)

@Serializable
data class StatsResponse(
    val totalTracks: Int? = null,
    val totalAlbums: Int? = null,
    val totalArtists: Int? = null,
    val totalPlaylists: Int? = null,
    val totalUsers: Int? = null
)

@Serializable
data class FollowResponse(
    val isFollowing: Boolean = false
)

@Serializable
data class FeedResponse(
    val featuredAlbum: Album? = null,
    val followedAlbums: List<Album> = emptyList(),
    val recommendedTracks: List<Track> = emptyList(),
    val discoverAlbums: List<Album> = emptyList(),
    val likedGenres: List<String> = emptyList(),
    val followedArtistCount: Int? = null,
    val recentlyPlayed: List<Track> = emptyList(),
    val topArtists: List<Artist> = emptyList(),
    val recommendedArtists: List<Artist> = emptyList(),
    val newReleases: List<Album> = emptyList()
)

// ---------------------------------------------------------------------------
// Multi-device sync — mirrors `SyncEvent` in src/lib/sync-bus.ts
// ---------------------------------------------------------------------------

@Serializable
data class SyncDevice(
    val id: String,
    val name: String,
    val isActive: Boolean = false,
    val lastSeenAt: String? = null
)

@Serializable
data class DevicesResponse(
    val devices: List<SyncDevice> = emptyList()
)

@Serializable
data class DeviceListEvent(
    val payload: DeviceListPayload = DeviceListPayload()
)

@Serializable
data class DeviceListPayload(
    val devices: List<SyncDevice> = emptyList()
)

@Serializable
data class SyncStateEvent(
    val fromDeviceId: String? = null,
    val payload: SyncStatePayload = SyncStatePayload()
)

@Serializable
data class SyncStatePayload(
    val trackId: String? = null,
    val currentTrack: Track? = null,
    val isPlaying: Boolean = false,
    val currentTime: Double = 0.0,
    val duration: Double = 0.0,
    val queue: List<Track> = emptyList(),
    val currentIndex: Int = 0,
    val activeDeviceId: String? = null
)

@Serializable
data class SyncCommandEvent(
    val fromDeviceId: String? = null,
    val targetDeviceId: String? = null,
    val payload: SyncCommandPayload = SyncCommandPayload()
)

@Serializable
data class SyncCommandPayload(
    val action: String = "",
    val seconds: Double? = null,
    val volume: Double? = null,
    val trackId: String? = null
)

@Serializable
data class SyncClaimEvent(
    val fromDeviceId: String? = null,
    val payload: SyncClaimPayload = SyncClaimPayload()
)

@Serializable
data class SyncClaimPayload(val deviceName: String = "")
