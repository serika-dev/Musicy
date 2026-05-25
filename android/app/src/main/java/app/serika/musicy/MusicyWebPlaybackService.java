package app.serika.musicy;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

public class MusicyWebPlaybackService extends Service {
    public static final String ACTION_UPDATE = "app.serika.musicy.action.UPDATE_WEB_PLAYBACK";
    public static final String ACTION_CLEAR = "app.serika.musicy.action.CLEAR_WEB_PLAYBACK";
    public static final String ACTION_PLAY = "app.serika.musicy.action.PLAY";
    public static final String ACTION_PAUSE = "app.serika.musicy.action.PAUSE";
    public static final String ACTION_NEXT = "app.serika.musicy.action.NEXT";
    public static final String ACTION_PREVIOUS = "app.serika.musicy.action.PREVIOUS";
    public static final String ACTION_SEEK_FORWARD = "app.serika.musicy.action.SEEK_FORWARD";
    public static final String ACTION_SEEK_BACKWARD = "app.serika.musicy.action.SEEK_BACKWARD";
    public static final String ACTION_STOP = "app.serika.musicy.action.STOP";

    public static final String EXTRA_TRACK_ID = "trackId";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";
    public static final String EXTRA_ARTWORK_URL = "artworkUrl";
    public static final String EXTRA_IS_PLAYING = "isPlaying";
    public static final String EXTRA_POSITION_SECONDS = "positionSeconds";
    public static final String EXTRA_DURATION_SECONDS = "durationSeconds";
    public static final String EXTRA_CAN_SKIP_NEXT = "canSkipNext";
    public static final String EXTRA_CAN_SKIP_PREVIOUS = "canSkipPrevious";

    private static final String CHANNEL_ID = "musicy_playback";
    private static final int NOTIFICATION_ID = 1030;
    private static final long SEEK_STEP_MS = 10_000L;

    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private MediaSession mediaSession;
    private BroadcastReceiver noisyReceiver;
    private boolean noisyReceiverRegistered = false;

    private String trackId = "";
    private String title = "Musicy";
    private String artist = "";
    private String album = "";
    private String artworkUrl = "";
    private boolean isPlaying = false;
    private long positionMs = 0L;
    private long durationMs = 0L;
    private boolean canSkipNext = false;
    private boolean canSkipPrevious = false;

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
        createMediaSession();
        createNoisyReceiver();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            publishForegroundNotification();
            return START_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_UPDATE.equals(action)) {
            updatePlaybackState(intent);
            publishForegroundNotification();
            return START_STICKY;
        }

        if (ACTION_CLEAR.equals(action) || ACTION_STOP.equals(action)) {
            sendPlaybackCommand("stop");
            clearPlaybackState();
            return START_NOT_STICKY;
        }

        handleTransportAction(action);
        publishForegroundNotification();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        unregisterNoisyReceiver();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    private void updatePlaybackState(Intent intent) {
        trackId = intent.getStringExtra(EXTRA_TRACK_ID);
        title = nonEmpty(intent.getStringExtra(EXTRA_TITLE), "Untitled");
        artist = nonEmpty(intent.getStringExtra(EXTRA_ARTIST), "Unknown Artist");
        album = nonEmpty(intent.getStringExtra(EXTRA_ALBUM), "");
        artworkUrl = nonEmpty(intent.getStringExtra(EXTRA_ARTWORK_URL), "");
        isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, false);
        positionMs = secondsToMs(intent.getDoubleExtra(EXTRA_POSITION_SECONDS, 0));
        durationMs = secondsToMs(intent.getDoubleExtra(EXTRA_DURATION_SECONDS, 0));
        canSkipNext = intent.getBooleanExtra(EXTRA_CAN_SKIP_NEXT, false);
        canSkipPrevious = intent.getBooleanExtra(EXTRA_CAN_SKIP_PREVIOUS, false);

        if (mediaSession != null) {
            mediaSession.setActive(true);
            mediaSession.setMetadata(buildMetadata());
            mediaSession.setPlaybackState(buildPlaybackState());
        }

        if (isPlaying) {
            requestAudioFocus();
            registerNoisyReceiver();
        } else {
            abandonAudioFocus();
            unregisterNoisyReceiver();
        }
    }

    private void handleTransportAction(String action) {
        if (ACTION_PLAY.equals(action)) {
            isPlaying = true;
            requestAudioFocus();
            registerNoisyReceiver();
            sendPlaybackCommand("play");
        } else if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
            abandonAudioFocus();
            unregisterNoisyReceiver();
            sendPlaybackCommand("pause");
        } else if (ACTION_NEXT.equals(action)) {
            sendPlaybackCommand("next");
        } else if (ACTION_PREVIOUS.equals(action)) {
            sendPlaybackCommand("previous");
        } else if (ACTION_SEEK_FORWARD.equals(action)) {
            sendPlaybackCommand("seekForward");
        } else if (ACTION_SEEK_BACKWARD.equals(action)) {
            sendPlaybackCommand("seekBackward");
        }

        if (mediaSession != null) {
            mediaSession.setPlaybackState(buildPlaybackState());
        }
    }

    private void clearPlaybackState() {
        isPlaying = false;
        unregisterNoisyReceiver();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setPlaybackState(buildPlaybackState());
            mediaSession.setActive(false);
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void createMediaSession() {
        mediaSession = new MediaSession(this, "MusicyWebPlayback");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setSessionActivity(activityIntent());
        mediaSession.setCallback(
            new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    handleTransportAction(ACTION_PLAY);
                    publishForegroundNotification();
                }

                @Override
                public void onPause() {
                    handleTransportAction(ACTION_PAUSE);
                    publishForegroundNotification();
                }

                @Override
                public void onSkipToNext() {
                    handleTransportAction(ACTION_NEXT);
                }

                @Override
                public void onSkipToPrevious() {
                    handleTransportAction(ACTION_PREVIOUS);
                }

                @Override
                public void onSeekTo(long pos) {
                    positionMs = Math.max(0, pos);
                    Intent command = playbackCommandIntent("seekTo");
                    command.putExtra(MusicyPlaybackPlugin.EXTRA_POSITION_SECONDS, positionMs / 1000.0);
                    sendBroadcast(command);
                    if (mediaSession != null) {
                        mediaSession.setPlaybackState(buildPlaybackState());
                    }
                }

                @Override
                public void onStop() {
                    sendPlaybackCommand("stop");
                    clearPlaybackState();
                }
            }
        );
    }

    private MediaMetadata buildMetadata() {
        MediaMetadata.Builder builder = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_MEDIA_ID, trackId == null ? "" : trackId)
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, album)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs);

        if (!artworkUrl.isEmpty()) {
            builder.putString(MediaMetadata.METADATA_KEY_ART_URI, artworkUrl);
            builder.putString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI, artworkUrl);
            builder.putString(MediaMetadata.METADATA_KEY_DISPLAY_ICON_URI, artworkUrl);
        }

        return builder.build();
    }

    private PlaybackState buildPlaybackState() {
        long actions = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_STOP
            | PlaybackState.ACTION_SEEK_TO
            | PlaybackState.ACTION_FAST_FORWARD
            | PlaybackState.ACTION_REWIND;

        if (canSkipNext) {
            actions |= PlaybackState.ACTION_SKIP_TO_NEXT;
        }
        if (canSkipPrevious) {
            actions |= PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        }

        return new PlaybackState.Builder()
            .setActions(actions)
            .setState(isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, positionMs, isPlaying ? 1f : 0f)
            .build();
    }

    private Notification buildNotification() {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        PendingIntent previousIntent = serviceIntent(ACTION_PREVIOUS);
        PendingIntent playPauseIntent = serviceIntent(isPlaying ? ACTION_PAUSE : ACTION_PLAY);
        PendingIntent nextIntent = serviceIntent(ACTION_NEXT);

        builder
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album.isEmpty() ? null : album)
            .setContentIntent(activityIntent())
            .setDeleteIntent(serviceIntent(ACTION_STOP))
            .setOnlyAlertOnce(true)
            .setOngoing(isPlaying)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "Previous", previousIntent).build())
            .addAction(
                new Notification.Action.Builder(
                    isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                    isPlaying ? "Pause" : "Play",
                    playPauseIntent
                ).build()
            )
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "Next", nextIntent).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0, 1, 2));

        if (!canSkipPrevious) {
            builder.setExtras(disabledActionExtras(0));
        }

        return builder.build();
    }

    private void publishForegroundNotification() {
        if (mediaSession != null) {
            mediaSession.setMetadata(buildMetadata());
            mediaSession.setPlaybackState(buildPlaybackState());
        }
        startForeground(NOTIFICATION_ID, buildNotification());
    }

    private Bundle disabledActionExtras(int actionIndex) {
        Bundle extras = new Bundle();
        extras.putBoolean("android.compactActions[" + actionIndex + "].disabled", true);
        return extras;
    }

    private PendingIntent activityIntent() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private PendingIntent serviceIntent(String action) {
        Intent intent = new Intent(this, MusicyWebPlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(
            this,
            requestCodeFor(action),
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    private int requestCodeFor(String action) {
        return action == null ? 0 : action.hashCode();
    }

    private void sendPlaybackCommand(String command) {
        sendBroadcast(playbackCommandIntent(command));
    }

    private Intent playbackCommandIntent(String command) {
        Intent intent = new Intent(MusicyPlaybackPlugin.ACTION_PLAYBACK_COMMAND);
        intent.setPackage(getPackageName());
        intent.putExtra(MusicyPlaybackPlugin.EXTRA_COMMAND, command);
        return intent;
    }

    private void requestAudioFocus() {
        if (audioManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest == null) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    .setWillPauseWhenDucked(true)
                    .setOnAudioFocusChangeListener(this::handleAudioFocusChange)
                    .build();
            }
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(this::handleAudioFocusChange, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(this::handleAudioFocusChange);
        }
    }

    private void handleAudioFocusChange(int focusChange) {
        if (
            focusChange == AudioManager.AUDIOFOCUS_LOSS ||
            focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
            focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK
        ) {
            isPlaying = false;
            sendPlaybackCommand("pause");
            unregisterNoisyReceiver();
            publishForegroundNotification();
        }
    }

    private void createNoisyReceiver() {
        noisyReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                    isPlaying = false;
                    sendPlaybackCommand("pause");
                    publishForegroundNotification();
                }
            }
        };
    }

    private void registerNoisyReceiver() {
        if (noisyReceiverRegistered || noisyReceiver == null) {
            return;
        }
        IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        ContextCompat.registerReceiver(this, noisyReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        noisyReceiverRegistered = true;
    }

    private void unregisterNoisyReceiver() {
        if (!noisyReceiverRegistered || noisyReceiver == null) {
            return;
        }
        try {
            unregisterReceiver(noisyReceiver);
        } catch (IllegalArgumentException ignored) {
        }
        noisyReceiverRegistered = false;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Musicy playback", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Playback controls for Musicy");
        channel.setShowBadge(false);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private long secondsToMs(double seconds) {
        if (Double.isNaN(seconds) || Double.isInfinite(seconds) || seconds <= 0) {
            return 0L;
        }
        return Math.round(seconds * 1000);
    }

    private String nonEmpty(@Nullable String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }
}
