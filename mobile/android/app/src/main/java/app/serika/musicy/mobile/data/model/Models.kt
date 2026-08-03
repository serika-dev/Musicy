package app.serika.musicy.mobile.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class ServerConfig(
    val baseUrl: String = "",
    val apiKey: String = "",
    val userName: String? = null
)

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
    val email: String,
    val username: String? = null,
    val displayName: String? = null,
    val avatarUrl: String? = null,
    val role: String? = null
)

@Serializable
data class Track(
    val id: String,
    val title: String,
    val duration: Int? = null,
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    @SerialName("filePath") val filePath: String? = null,
    val format: String? = null,
    val genre: String? = null,
    @SerialName("playCount") val playCount: Int? = null,
    val artist: Artist? = null,
    val album: Album? = null,
    @SerialName("featuredArtists") val featuredArtists: List<Artist>? = null
)

@Serializable
data class Artist(
    val id: String,
    val name: String,
    @SerialName("imageUrl") val imageUrl: String? = null,
    val verified: Boolean? = null,
    val bio: String? = null
)

@Serializable
data class Album(
    val id: String,
    val title: String,
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    @SerialName("releaseDate") val releaseDate: String? = null,
    val genre: String? = null,
    @SerialName("albumType") val albumType: String? = null,
    val artist: Artist? = null,
    val tracks: List<Track>? = null,
    @SerialName("_count") val count: Count? = null
)

@Serializable
data class Count(
    val tracks: Int? = null,
    val albums: Int? = null,
    val followers: Int? = null
)

@Serializable
data class Playlist(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    @SerialName("isPublic") val isPublic: Boolean? = null,
    val tracks: List<PlaylistTrack>? = null,
    @SerialName("_count") val count: Count? = null
)

@Serializable
data class PlaylistTrack(
    val id: String,
    val position: Int,
    val track: Track
)

@Serializable
data class DailyMix(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    val tracks: List<Track>? = null
)

@Serializable
data class AlbumsResponse(
    val albums: List<Album>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerialName("hasMore") val hasMore: Boolean
)

@Serializable
data class ArtistsResponse(
    val artists: List<Artist>,
    val total: Int,
    val limit: Int,
    val offset: Int
)

@Serializable
data class TracksResponse(
    val tracks: List<Track>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerialName("hasMore") val hasMore: Boolean
)

@Serializable
data class PlaylistsResponse(
    val playlists: List<Playlist>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerialName("hasMore") val hasMore: Boolean
)

@Serializable
data class SearchResponse(
    val tracks: Paged<Track>? = null,
    val albums: Paged<Album>? = null,
    val artists: Paged<Artist>? = null,
    val playlists: Paged<Playlist>? = null
)

@Serializable
data class Paged<T>(
    val items: List<T>,
    val total: Int,
    val limit: Int,
    val offset: Int
)

@Serializable
data class PublicSettingsResponse(
    val settings: Map<String, String> = emptyMap()
)

@Serializable
data class PlayRequest(
    @SerialName("trackId") val trackId: String,
    val duration: Int? = null
)

@Serializable
data class LyricsResponse(
    @SerialName("lrcId") val lrcId: Int? = null,
    @SerialName("plainLyrics") val plainLyrics: String? = null,
    @SerialName("syncedLyrics") val syncedLyrics: String? = null
)

@Serializable
data class LikedSongsResponse(
    val tracks: List<Track>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerialName("hasMore") val hasMore: Boolean
)
