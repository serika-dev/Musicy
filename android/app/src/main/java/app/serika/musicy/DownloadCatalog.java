package app.serika.musicy;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class DownloadCatalog {
    static final String DOWNLOAD_DIR = "musicy-downloads";
    private static final String PREFS = "musicy_download_catalog";
    private static final String KEY_TRACKS = "tracks";

    private final Context context;
    private final SharedPreferences preferences;

    DownloadCatalog(Context context) {
        this.context = context.getApplicationContext();
        this.preferences = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    File downloadsDir() {
        File dir = new File(context.getFilesDir(), DOWNLOAD_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    File fileForTrack(String id, String extension) {
        return new File(downloadsDir(), safeFileName(id) + "." + extension);
    }

    File artworkFileForTrack(String id, String extension) {
        return new File(downloadsDir(), safeFileName(id) + "-artwork." + extension);
    }

    synchronized List<DownloadedTrack> getTracks() {
        List<DownloadedTrack> tracks = new ArrayList<>();
        JSONArray array = readArray();

        for (int i = 0; i < array.length(); i++) {
            JSONObject object = array.optJSONObject(i);
            if (object == null) continue;

            DownloadedTrack track = DownloadedTrack.fromJson(object);
            if (track != null && track.fileExists()) {
                tracks.add(track);
            }
        }

        return tracks;
    }

    synchronized DownloadedTrack getTrack(String id) {
        for (DownloadedTrack track : getTracks()) {
            if (track.id.equals(id)) {
                return track;
            }
        }
        return null;
    }

    synchronized void upsert(DownloadedTrack incoming) {
        List<DownloadedTrack> tracks = getTracks();
        boolean replaced = false;

        for (int i = 0; i < tracks.size(); i++) {
            if (tracks.get(i).id.equals(incoming.id)) {
                tracks.set(i, incoming);
                replaced = true;
                break;
            }
        }

        if (!replaced) {
            tracks.add(0, incoming);
        }

        writeTracks(tracks);
    }

    synchronized void remove(String id) {
        List<DownloadedTrack> remaining = new ArrayList<>();

        for (DownloadedTrack track : getTracks()) {
            if (track.id.equals(id)) {
                track.deleteFiles();
            } else {
                remaining.add(track);
            }
        }

        writeTracks(remaining);
    }

    synchronized JSArray toJSArray() {
        JSArray array = new JSArray();
        for (DownloadedTrack track : getTracks()) {
            array.put(track.toJSObject());
        }
        return array;
    }

    private JSONArray readArray() {
        try {
            return new JSONArray(preferences.getString(KEY_TRACKS, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    private void writeTracks(List<DownloadedTrack> tracks) {
        JSONArray array = new JSONArray();
        for (DownloadedTrack track : tracks) {
            array.put(track.toJson());
        }
        preferences.edit().putString(KEY_TRACKS, array.toString()).apply();
    }

    static String extensionFrom(String url, String format, String mimeType) {
        String normalizedFormat = format == null ? "" : format.toLowerCase(Locale.US);
        if (normalizedFormat.contains("flac")) return "flac";
        if (normalizedFormat.contains("wav")) return "wav";
        if (normalizedFormat.contains("aac")) return "aac";
        if (normalizedFormat.contains("m4a")) return "m4a";
        if (normalizedFormat.contains("ogg") || normalizedFormat.contains("opus")) return "ogg";
        if (normalizedFormat.contains("mp3")) return "mp3";

        String normalizedMime = mimeType == null ? "" : mimeType.toLowerCase(Locale.US);
        if (normalizedMime.contains("flac")) return "flac";
        if (normalizedMime.contains("wav")) return "wav";
        if (normalizedMime.contains("aac")) return "aac";
        if (normalizedMime.contains("mp4")) return "m4a";
        if (normalizedMime.contains("ogg") || normalizedMime.contains("opus")) return "ogg";
        if (normalizedMime.contains("mpeg")) return "mp3";

        if (url != null) {
            String cleanUrl = url.split("\\?")[0];
            int dot = cleanUrl.lastIndexOf('.');
            if (dot >= 0 && dot < cleanUrl.length() - 1) {
                String extension = cleanUrl.substring(dot + 1).toLowerCase(Locale.US);
                if (extension.matches("[a-z0-9]{2,5}")) return extension;
            }
        }

        return "mp3";
    }

    static String safeFileName(String id) {
        return id.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    static final class DownloadedTrack {
        String id;
        String title;
        String artistId;
        String artistName;
        String albumId;
        String albumTitle;
        String coverImageUrl;
        String artworkUri;
        String fileUri;
        String format;
        String genre;
        String mimeType;
        long duration;
        long sizeBytes;
        long downloadedAt;

        static DownloadedTrack fromJson(JSONObject object) {
            String id = object.optString("id", "");
            String fileUri = object.optString("fileUri", "");
            if (id.isEmpty() || fileUri.isEmpty()) return null;

            DownloadedTrack track = new DownloadedTrack();
            track.id = id;
            track.title = object.optString("title", "Untitled");
            track.artistId = object.optString("artistId", "");
            track.artistName = object.optString("artistName", "Unknown Artist");
            track.albumId = object.optString("albumId", "");
            track.albumTitle = object.optString("albumTitle", "");
            track.coverImageUrl = object.optString("coverImageUrl", "");
            track.artworkUri = object.optString("artworkUri", "");
            track.fileUri = fileUri;
            track.format = object.optString("format", "LOCAL");
            track.genre = object.optString("genre", "");
            track.mimeType = object.optString("mimeType", "");
            track.duration = object.optLong("duration", 0);
            track.sizeBytes = object.optLong("sizeBytes", 0);
            track.downloadedAt = object.optLong("downloadedAt", System.currentTimeMillis());
            return track;
        }

        JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("id", id);
                object.put("title", title);
                object.put("artistId", artistId);
                object.put("artistName", artistName);
                object.put("albumId", albumId);
                object.put("albumTitle", albumTitle);
                object.put("coverImageUrl", coverImageUrl);
                object.put("artworkUri", artworkUri);
                object.put("fileUri", fileUri);
                object.put("format", format);
                object.put("genre", genre);
                object.put("mimeType", mimeType);
                object.put("duration", duration);
                object.put("sizeBytes", sizeBytes);
                object.put("downloadedAt", downloadedAt);
            } catch (JSONException ignored) {}
            return object;
        }

        JSObject toJSObject() {
            JSObject object = new JSObject();
            object.put("id", id);
            object.put("title", title);
            object.put("artistId", artistId);
            object.put("artistName", artistName);
            object.put("albumId", albumId);
            object.put("albumTitle", albumTitle);
            object.put("coverImageUrl", coverImageUrl);
            object.put("artworkUri", artworkUri);
            object.put("fileUri", fileUri);
            object.put("format", format);
            object.put("genre", genre);
            object.put("mimeType", mimeType);
            object.put("duration", duration);
            object.put("sizeBytes", sizeBytes);
            object.put("downloadedAt", downloadedAt);
            return object;
        }

        File file() {
            String path = Uri.parse(fileUri).getPath();
            return path == null ? null : new File(path);
        }

        boolean fileExists() {
            File file = file();
            return file != null && file.exists() && file.length() > 0;
        }

        void deleteFiles() {
            File file = file();
            if (file != null && file.exists()) {
                file.delete();
            }

            if (artworkUri != null && !artworkUri.isEmpty()) {
                String artworkPath = Uri.parse(artworkUri).getPath();
                if (artworkPath != null) {
                    File artwork = new File(artworkPath);
                    if (artwork.exists()) {
                        artwork.delete();
                    }
                }
            }
        }
    }
}
