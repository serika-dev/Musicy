package app.serika.musicy.mobile.data.api

import app.serika.musicy.mobile.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * The full Musicy HTTP surface the app talks to. Authenticated calls go out
 * with `Authorization: Bearer <apiKey>` (see [ApiClient]).
 */
interface MusicyApi {

    // -- auth ---------------------------------------------------------------

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/mobile/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @GET("api/settings/public")
    suspend fun getPublicSettings(): PublicSettingsResponse

    @GET("api/stats")
    suspend fun getStats(): StatsResponse

    // -- home ---------------------------------------------------------------

    @GET("api/mobile/feed")
    suspend fun getFeed(): FeedResponse

    @GET("api/daily-mixes")
    suspend fun getDailyMixes(): List<DailyMix>

    @GET("api/daily-mixes/{id}")
    suspend fun getDailyMix(@Path("id") id: String): DailyMix

    @GET("api/genres")
    suspend fun getGenres(): GenresResponse

    // -- catalogue ----------------------------------------------------------

    @GET("api/albums")
    suspend fun getAlbums(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("genre") genre: String? = null,
        @Query("sort") sort: String? = null
    ): AlbumsResponse

    @GET("api/albums/{id}")
    suspend fun getAlbum(@Path("id") id: String): Album

    @GET("api/artists")
    suspend fun getArtists(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("search") search: String? = null
    ): ArtistsResponse

    @GET("api/artists/{id}")
    suspend fun getArtist(@Path("id") id: String): Artist

    @GET("api/artists/{id}/tracks")
    suspend fun getArtistTracks(
        @Path("id") id: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): TracksResponse

    @GET("api/artists/{id}/albums")
    suspend fun getArtistAlbums(
        @Path("id") id: String,
        @Query("limit") limit: Int = 50
    ): AlbumsResponse

    @GET("api/artists/{id}/follow")
    suspend fun getFollowState(@Path("id") id: String): FollowResponse

    @POST("api/artists/{id}/follow")
    suspend fun followArtist(@Path("id") id: String): Response<Unit>

    @DELETE("api/artists/{id}/follow")
    suspend fun unfollowArtist(@Path("id") id: String): Response<Unit>

    @GET("api/tracks")
    suspend fun getTracks(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0,
        @Query("genre") genre: String? = null,
        @Query("sort") sort: String? = null
    ): TracksResponse

    @GET("api/tracks/{id}")
    suspend fun getTrack(@Path("id") id: String): Track

    @GET("api/tracks/{id}/lyrics")
    suspend fun getLyrics(@Path("id") id: String): LyricsResponse

    @GET("api/search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String = "track,album,artist,playlist"
    ): SearchResponse

    // -- playlists ----------------------------------------------------------

    @GET("api/playlists")
    suspend fun getPlaylists(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0,
        @Query("mine") mine: Boolean? = null
    ): PlaylistsResponse

    @GET("api/playlists/{id}")
    suspend fun getPlaylist(@Path("id") id: String): Playlist

    @POST("api/playlists")
    suspend fun createPlaylist(@Body body: CreatePlaylistRequest): Playlist

    @POST("api/playlists/{id}/tracks")
    suspend fun addTracksToPlaylist(
        @Path("id") id: String,
        @Body body: PlaylistTracksRequest
    ): Response<Unit>

    // Retrofit's @DELETE cannot carry a body, and this endpoint expects one.
    @HTTP(method = "DELETE", path = "api/playlists/{id}/tracks", hasBody = true)
    suspend fun removeTracksFromPlaylist(
        @Path("id") id: String,
        @Body body: PlaylistTracksRequest
    ): Response<Unit>

    // -- library / me -------------------------------------------------------

    @GET("api/user/profile")
    suspend fun getProfile(): User

    @GET("api/mobile/liked-songs")
    suspend fun getLikedSongs(
        @Query("limit") limit: Int = 200,
        @Query("offset") offset: Int = 0
    ): LikedSongsResponse

    @POST("api/user/liked-songs")
    suspend fun likeTrack(@Body body: LikeRequest): Response<Unit>

    @DELETE("api/user/liked-songs")
    suspend fun unlikeTrack(@Query("trackId") trackId: String): Response<Unit>

    @GET("api/user/recently-played")
    suspend fun getRecentlyPlayed(): RecentlyPlayedResponse

    @GET("api/user/followed-artists")
    suspend fun getFollowedArtists(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): ArtistsResponse

    @POST("api/track/play")
    suspend fun recordPlay(@Body body: PlayRequest): Response<Unit>

    // -- multi-device sync --------------------------------------------------

    @GET("api/sync/devices")
    suspend fun getDevices(): DevicesResponse
}
