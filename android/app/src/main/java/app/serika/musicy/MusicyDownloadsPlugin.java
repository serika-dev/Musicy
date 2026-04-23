package app.serika.musicy;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MusicyDownloads")
public class MusicyDownloadsPlugin extends Plugin {
    private DownloadCatalog catalog;
    private ExecutorService executor;

    @Override
    public void load() {
        catalog = new DownloadCatalog(getContext());
        executor = Executors.newSingleThreadExecutor();
    }

    @PluginMethod
    public void getDownloads(PluginCall call) {
        JSObject response = new JSObject();
        response.put("tracks", catalog.toJSArray());
        call.resolve(response);
    }

    @PluginMethod
    public void getTrackUri(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Track id is required");
            return;
        }

        DownloadCatalog.DownloadedTrack track = catalog.getTrack(id);
        JSObject response = new JSObject();
        if (track != null) {
            response.put("fileUri", track.fileUri);
        }
        call.resolve(response);
    }

    @PluginMethod
    public void removeTrack(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Track id is required");
            return;
        }

        catalog.remove(id);
        call.resolve();
    }

    @PluginMethod
    public void playTrack(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Track id is required");
            return;
        }

        Intent intent = new Intent(getContext(), MusicyMediaService.class);
        intent.setAction(MusicyMediaService.ACTION_PLAY_DOWNLOAD);
        intent.putExtra(MusicyMediaService.EXTRA_TRACK_ID, id);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void downloadTrack(PluginCall call) {
        String sourceUrl = call.getString("sourceUrl");
        JSObject trackData = call.getObject("track");

        if (sourceUrl == null || sourceUrl.isEmpty() || trackData == null) {
            call.reject("sourceUrl and track are required");
            return;
        }

        if (trackData.optString("id").isEmpty()) {
            call.reject("Track id is required");
            return;
        }

        executor.execute(() -> {
            try {
                DownloadCatalog.DownloadedTrack downloadedTrack = downloadTrackFile(sourceUrl, call.getString("coverImageUrl"), trackData);
                catalog.upsert(downloadedTrack);
                call.resolve(downloadedTrack.toJSObject());
            } catch (Exception error) {
                call.reject("Failed to download track natively", error);
            }
        });
    }

    private DownloadCatalog.DownloadedTrack downloadTrackFile(String sourceUrl, String coverImageUrl, JSObject trackData) throws Exception {
        String id = trackData.optString("id");
        String format = trackData.optString("format", "LOCAL");

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(sourceUrl).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "Musicy Android");
            connection.connect();

            int statusCode = connection.getResponseCode();
            if (statusCode < 200 || statusCode >= 300) {
                throw new IllegalStateException("Audio download failed with HTTP " + statusCode);
            }

            String mimeType = connection.getContentType();
            String extension = DownloadCatalog.extensionFrom(sourceUrl, format, mimeType);
            File outputFile = catalog.fileForTrack(id, extension);
            File tempFile = new File(outputFile.getParentFile(), outputFile.getName() + ".tmp");

            long size = copy(connection.getInputStream(), tempFile);
            if (outputFile.exists() && !outputFile.delete()) {
                throw new IllegalStateException("Could not replace existing native download");
            }
            if (!tempFile.renameTo(outputFile)) {
                tempFile.delete();
                throw new IllegalStateException("Could not move native download into place");
            }

            String artworkUri = downloadArtwork(id, coverImageUrl != null ? coverImageUrl : trackData.optString("coverImageUrl", ""));

            DownloadCatalog.DownloadedTrack track = new DownloadCatalog.DownloadedTrack();
            track.id = id;
            track.title = trackData.optString("title", "Untitled");
            track.artistId = trackData.optString("artistId", "");
            track.artistName = trackData.optString("artistName", "Unknown Artist");
            track.albumId = trackData.optString("albumId", "");
            track.albumTitle = trackData.optString("albumTitle", "");
            track.coverImageUrl = trackData.optString("coverImageUrl", coverImageUrl != null ? coverImageUrl : "");
            track.artworkUri = artworkUri;
            track.fileUri = Uri.fromFile(outputFile).toString();
            track.format = format;
            track.genre = trackData.optString("genre", "");
            track.mimeType = mimeType != null ? mimeType : "";
            track.duration = trackData.optLong("duration", 0);
            track.sizeBytes = size;
            track.downloadedAt = System.currentTimeMillis();
            return track;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String downloadArtwork(String id, String coverImageUrl) {
        if (coverImageUrl == null || coverImageUrl.isEmpty()) {
            return "";
        }

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(coverImageUrl).openConnection();
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            connection.setRequestProperty("User-Agent", "Musicy Android");
            connection.connect();

            int statusCode = connection.getResponseCode();
            if (statusCode < 200 || statusCode >= 300) {
                return "";
            }

            String extension = DownloadCatalog.extensionFrom(coverImageUrl, "jpg", connection.getContentType());
            File outputFile = catalog.artworkFileForTrack(id, extension);
            copy(connection.getInputStream(), outputFile);
            return Uri.fromFile(outputFile).toString();
        } catch (Exception ignored) {
            return "";
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private long copy(InputStream inputStream, File outputFile) throws Exception {
        long total = 0;
        byte[] buffer = new byte[128 * 1024];

        try (InputStream input = inputStream; FileOutputStream output = new FileOutputStream(outputFile)) {
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                total += read;
            }
            output.flush();
        }

        return total;
    }
}
