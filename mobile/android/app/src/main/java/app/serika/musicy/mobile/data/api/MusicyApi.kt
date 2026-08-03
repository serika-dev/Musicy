package app.serika.musicy.mobile.data.api

import app.serika.musicy.mobile.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface MusicyApi {
    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/mobile/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @GET("api/settings/public")
    suspend fun getPublicSettings(): PublicSettingsResponse

    @GET("api/daily-mixes")
    suspend fun getDailyMixes(): List<DailyMix>

    @GET("api/albums")
    suspend fun getAlbums(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
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
        @Query("limit") limit: Int = 50
    ): TracksResponse

    @GET("api/playlists")
    suspend fun getPlaylists(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): PlaylistsResponse

    @GET("api/playlists/{id}")
    suspend fun getPlaylist(@Path("id") id: String): Playlist

    @GET("api/search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String = "track,album,artist,playlist"
    ): SearchResponse

    @GET("api/tracks/{id}")
    suspend fun getTrack(@Path("id") id: String): Track

    @POST("api/track/play")
    suspend fun recordPlay(@Body body: PlayRequest): Response<Unit>

    @GET("api/tracks/{id}/lyrics")
    suspend fun getLyrics(@Path("id") id: String): LyricsResponse

    @GET("api/user/liked-songs")
    suspend fun getLikedSongs(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): LikedSongsResponse
}
