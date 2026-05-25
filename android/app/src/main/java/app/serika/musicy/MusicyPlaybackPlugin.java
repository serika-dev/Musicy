package app.serika.musicy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MusicyPlayback")
public class MusicyPlaybackPlugin extends Plugin {
    public static final String ACTION_PLAYBACK_COMMAND = "app.serika.musicy.action.PLAYBACK_COMMAND";
    public static final String EXTRA_COMMAND = "command";
    public static final String EXTRA_POSITION_SECONDS = "positionSeconds";

    private BroadcastReceiver commandReceiver;

    @Override
    public void load() {
        commandReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String command = intent.getStringExtra(EXTRA_COMMAND);
                if (command == null || command.isEmpty()) {
                    return;
                }

                JSObject payload = new JSObject();
                payload.put("action", command);
                if (intent.hasExtra(EXTRA_POSITION_SECONDS)) {
                    payload.put("positionSeconds", intent.getDoubleExtra(EXTRA_POSITION_SECONDS, 0));
                }
                notifyListeners("playbackAction", payload, true);
            }
        };

        IntentFilter filter = new IntentFilter(ACTION_PLAYBACK_COMMAND);
        ContextCompat.registerReceiver(getContext(), commandReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        if (commandReceiver != null) {
            try {
                getContext().unregisterReceiver(commandReceiver);
            } catch (IllegalArgumentException ignored) {
            }
            commandReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void updateSession(PluginCall call) {
        Intent intent = new Intent(getContext(), MusicyWebPlaybackService.class);
        intent.setAction(MusicyWebPlaybackService.ACTION_UPDATE);
        intent.putExtra(MusicyWebPlaybackService.EXTRA_TRACK_ID, call.getString("id", ""));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_TITLE, call.getString("title", "Untitled"));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_ARTIST, call.getString("artist", "Unknown Artist"));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_ALBUM, call.getString("album", ""));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_ARTWORK_URL, call.getString("artworkUrl", ""));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_IS_PLAYING, Boolean.TRUE.equals(call.getBoolean("isPlaying")));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_POSITION_SECONDS, call.getDouble("positionSeconds", 0.0));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_DURATION_SECONDS, call.getDouble("durationSeconds", 0.0));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_CAN_SKIP_NEXT, Boolean.TRUE.equals(call.getBoolean("canSkipNext")));
        intent.putExtra(MusicyWebPlaybackService.EXTRA_CAN_SKIP_PREVIOUS, Boolean.TRUE.equals(call.getBoolean("canSkipPrevious")));

        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        Intent intent = new Intent(getContext(), MusicyWebPlaybackService.class);
        intent.setAction(MusicyWebPlaybackService.ACTION_CLEAR);
        try {
            getContext().startService(intent);
        } catch (IllegalStateException ignored) {
        }
        call.resolve();
    }
}
