package app.serika.musicy.mobile.data.api

import app.serika.musicy.mobile.data.model.ServerConfig
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Builds the HTTP stack for a given [ServerConfig]. Instances are cached per
 * config so the UI, the playback service and the sync client all share one
 * connection pool instead of opening three.
 */
object ApiClient {
    const val DEFAULT_BASE_URL = "https://music.serika.dev"

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
        explicitNulls = false
        encodeDefaults = true
    }

    private val apis = mutableMapOf<ServerConfig, MusicyApi>()
    private val clients = mutableMapOf<ServerConfig, OkHttpClient>()
    private val streamClients = mutableMapOf<ServerConfig, OkHttpClient>()

    /** `https://host` with no trailing slash. */
    fun normalizedBaseUrl(config: ServerConfig): String =
        config.baseUrl.trim().trimEnd('/').ifBlank { DEFAULT_BASE_URL }

    /**
     * Turns a possibly-relative API value (cover art, audio file) into
     * something the player and image loader can actually fetch.
     */
    fun absoluteUrl(config: ServerConfig, path: String?): String? {
        val value = path?.trim().orEmpty()
        if (value.isBlank()) return null
        if (value.startsWith("http://", ignoreCase = true) ||
            value.startsWith("https://", ignoreCase = true) ||
            value.startsWith("content://") ||
            value.startsWith("file://")
        ) {
            return value
        }
        val base = normalizedBaseUrl(config)
        return if (value.startsWith("/")) base + value else "$base/$value"
    }

    private fun builder(config: ServerConfig): OkHttpClient.Builder =
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder().apply {
                    header("Accept", "application/json")
                    header("User-Agent", "Musicy-Android")
                    if (config.apiKey.isNotBlank()) {
                        header("Authorization", "Bearer ${config.apiKey}")
                    }
                }.build()
                chain.proceed(request)
            }
            .addInterceptor(
                HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            )

    /** Ordinary API calls: a hung request should fail, not wedge a screen. */
    @Synchronized
    fun okHttp(config: ServerConfig): OkHttpClient = clients.getOrPut(config) {
        builder(config).readTimeout(30, TimeUnit.SECONDS).build()
    }

    /**
     * The sync stream is a long-lived SSE response, so its reads must never
     * time out — the server sends its own heartbeats. Kept separate so this
     * setting can't leak into normal requests.
     */
    @Synchronized
    fun streamOkHttp(config: ServerConfig): OkHttpClient = streamClients.getOrPut(config) {
        builder(config)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(30, TimeUnit.SECONDS)
            .build()
    }

    @Synchronized
    fun create(config: ServerConfig): MusicyApi = apis.getOrPut(config) {
        Retrofit.Builder()
            .baseUrl(normalizedBaseUrl(config) + "/")
            .client(okHttp(config))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(MusicyApi::class.java)
    }
}
