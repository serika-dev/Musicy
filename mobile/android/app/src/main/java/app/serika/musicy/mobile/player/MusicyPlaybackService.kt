package app.serika.musicy.mobile.player

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media.MediaBrowserServiceCompat
import androidx.media3.common.MediaItem
import androidx.media.session.MediaButtonReceiver
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import app.serika.musicy.mobile.MainActivity
import app.serika.musicy.mobile.R
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.api.MusicyApi
import app.serika.musicy.mobile.data.model.ServerConfig
import app.serika.musicy.mobile.data.model.Track
import app.serika.musicy.mobile.data.preferences.ServerConfigStore
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first

private const val MEDIA_ROOT_ID = "__ROOT__"
private const val TAG = "MusicyPlaybackSvc"
private const val CHANNEL_ID = "musicy_playback"
private const val NOTIFICATION_ID = 1

class MusicyPlaybackService : MediaBrowserServiceCompat() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    private lateinit var player: ExoPlayer
    private lateinit var mediaSession: MediaSessionCompat
    private lateinit var api: MusicyApi
    private lateinit var config: ServerConfig

    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val store = ServerConfigStore(this)
        config = try {
            runBlocking { store.config.first() }
        } catch (e: Exception) {
            ServerConfig()
        }
        api = ApiClient.create(config)

        player = ExoPlayer.Builder(this).build().apply {
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    updatePlaybackState(if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED)
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) {
                        updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
                    }
                }
            })
        }

        val sessionCallback = MediaSessionCallback()
        mediaSession = MediaSessionCompat(this, "Musicy").apply {
            setCallback(sessionCallback)
            setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
            setSessionActivity(
                PendingIntent.getActivity(
                    this@MusicyPlaybackService,
                    0,
                    Intent(this@MusicyPlaybackService, MainActivity::class.java),
                    PendingIntent.FLAG_IMMUTABLE
                )
            )
            isActive = true
        }
        sessionToken = mediaSession.sessionToken

        updatePlaybackState(PlaybackStateCompat.STATE_NONE)
    }

    override fun onDestroy() {
        player.release()
        mediaSession.release()
        job.cancel()
        super.onDestroy()
    }

    override fun onGetRoot(clientPackageName: String, clientUid: Int, rootHints: Bundle?): BrowserRoot? {
        return BrowserRoot(MEDIA_ROOT_ID, null)
    }

    override fun onLoadChildren(parentId: String, result: Result<MutableList<MediaBrowserCompat.MediaItem>>) {
        result.detach()
        scope.launch {
            try {
                val items = loadChildrenFor(parentId)
                result.sendResult(items.toMutableList())
            } catch (e: Exception) {
                Log.e(TAG, "Error loading children for $parentId", e)
                result.sendResult(mutableListOf())
            }
        }
    }

    private suspend fun loadChildrenFor(parentId: String): List<MediaBrowserCompat.MediaItem> = when (parentId) {
        MEDIA_ROOT_ID -> listOf(
            browsable("menu_daily_mixes", "Daily Mixes", "Mixes made for you", null),
            browsable("menu_albums", "Albums", "Browse albums", null),
            browsable("menu_artists", "Artists", "Browse artists", null),
            browsable("menu_playlists", "Playlists", "Community playlists", null),
            browsable("menu_liked", "Liked Songs", "Your liked tracks", null)
        )
        "menu_daily_mixes" -> api.getDailyMixes().map { mix ->
            browsable("mix_${mix.id}", mix.name, mix.description ?: "", mix.coverImageUrl)
        }
        "menu_albums" -> api.getAlbums(limit = 20).albums.map { album ->
            browsable("album_${album.id}", album.title, album.artist?.name ?: "", album.coverImageUrl)
        }
        "menu_artists" -> api.getArtists(limit = 20).artists.map { artist ->
            browsable("artist_${artist.id}", artist.name, "", artist.imageUrl)
        }
        "menu_playlists" -> api.getPlaylists(limit = 20).playlists.map { playlist ->
            browsable("playlist_${playlist.id}", playlist.name, "${playlist.count?.tracks ?: 0} tracks", playlist.coverImageUrl)
        }
        "menu_liked" -> api.getLikedSongs(limit = 50).tracks.map { track ->
            playable("track_${track.id}", track.title, track.artist?.name ?: "", track.album?.coverImageUrl ?: track.coverImageUrl)
        }
        else -> when {
            parentId.startsWith("mix_") -> {
                val id = parentId.removePrefix("mix_")
                val mix = api.getDailyMixes().find { it.id == id }
                mix?.tracks?.map { track ->
                    playable("track_${track.id}", track.title, track.artist?.name ?: "", track.album?.coverImageUrl ?: track.coverImageUrl)
                } ?: emptyList()
            }
            parentId.startsWith("album_") -> {
                val id = parentId.removePrefix("album_")
                val album = api.getAlbum(id)
                album.tracks?.map { track ->
                    playable("track_${track.id}", track.title, track.artist?.name ?: "", album.coverImageUrl ?: track.coverImageUrl)
                } ?: emptyList()
            }
            parentId.startsWith("artist_") -> {
                val id = parentId.removePrefix("artist_")
                val tracks = api.getArtistTracks(id, limit = 50).tracks
                tracks.map { track ->
                    playable("track_${track.id}", track.title, track.artist?.name ?: "", track.album?.coverImageUrl ?: track.coverImageUrl)
                }
            }
            parentId.startsWith("playlist_") -> {
                val id = parentId.removePrefix("playlist_")
                val playlist = api.getPlaylist(id)
                playlist.tracks?.map { playlistTrack ->
                    val track = playlistTrack.track
                    playable("track_${track.id}", track.title, track.artist?.name ?: "", playlist.coverImageUrl ?: track.coverImageUrl)
                } ?: emptyList()
            }
            else -> emptyList()
        }
    }

    private fun browsable(mediaId: String, title: String, subtitle: String, iconUri: String?): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(iconUri?.let { Uri.parse(it) })
            .build()
        return MediaBrowserCompat.MediaItem(description, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE)
    }

    private fun playable(mediaId: String, title: String, subtitle: String, iconUri: String?): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(mediaId)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(iconUri?.let { Uri.parse(it) })
            .build()
        return MediaBrowserCompat.MediaItem(description, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE)
    }

    private fun playTrack(track: Track) {
        val url = track.filePath ?: return
        val mediaItem = MediaItem.fromUri(url)
        handler.post {
            player.setMediaItem(mediaItem)
            player.prepare()
            player.play()
            updateMetadata(track)
            updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
            startForeground(NOTIFICATION_ID, buildNotification())
        }
    }

    private fun updateMetadata(track: Track) {
        val builder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, track.id)
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, track.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, track.artist?.name)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, track.album?.title)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (track.duration ?: 0).toLong() * 1000L)
        track.album?.coverImageUrl?.let { builder.putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, it) }
        track.coverImageUrl?.let { builder.putString(MediaMetadataCompat.METADATA_KEY_ART_URI, it) }
        mediaSession.setMetadata(builder.build())
    }

    private fun updatePlaybackState(state: Int) {
        val position = player.currentPosition.coerceAtLeast(0L)
        val playbackState = PlaybackStateCompat.Builder()
            .setState(state, position, 1.0f)
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_PLAY_PAUSE or
                        PlaybackStateCompat.ACTION_STOP
            )
            .build()
        mediaSession.setPlaybackState(playbackState)
    }

    private fun buildNotification(): android.app.Notification {
        val playPauseAction = if (player.isPlaying) {
            NotificationCompat.Action(
                R.drawable.ic_pause, "Pause",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PAUSE)
            )
        } else {
            NotificationCompat.Action(
                R.drawable.ic_play, "Play",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PLAY)
            )
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(mediaSession.controller.metadata?.getString(MediaMetadataCompat.METADATA_KEY_TITLE) ?: "Musicy")
            .setContentText(mediaSession.controller.metadata?.getString(MediaMetadataCompat.METADATA_KEY_ARTIST) ?: "")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setStyle(androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.sessionToken)
                .setShowActionsInCompactView(0))
            .addAction(playPauseAction)
            .setContentIntent(mediaSession.controller.sessionActivity)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.channel_playback_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply { description = getString(R.string.channel_playback_description) }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }

    private inner class MediaSessionCallback : MediaSessionCompat.Callback() {
        override fun onPlay() {
            handler.post {
                if (player.playbackState == Player.STATE_IDLE && player.currentMediaItem == null) {
                    // nothing to resume
                } else {
                    player.play()
                    startForeground(NOTIFICATION_ID, buildNotification())
                }
            }
        }

        override fun onPause() {
            handler.post {
                player.pause()
                stopForeground(false)
                updatePlaybackState(PlaybackStateCompat.STATE_PAUSED)
            }
        }

        override fun onStop() {
            handler.post {
                player.stop()
                stopForeground(true)
                updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
            }
        }

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            val id = mediaId?.removePrefix("track_") ?: return
            scope.launch {
                try {
                    val track = api.getTrack(id)
                    playTrack(track)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to load track $id", e)
                }
            }
        }
    }
}
