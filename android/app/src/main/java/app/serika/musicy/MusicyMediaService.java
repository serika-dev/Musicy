package app.serika.musicy;

import android.content.Intent;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaLibraryService.LibraryParams;
import androidx.media3.session.MediaSession;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MusicyMediaService extends MediaLibraryService {
    public static final String ACTION_PLAY_DOWNLOAD = "app.serika.musicy.action.PLAY_DOWNLOAD";
    public static final String EXTRA_TRACK_ID = "trackId";

    private static final String ROOT_ID = "musicy-root";
    private static final String DOWNLOADS_ID = "musicy-downloads";

    private ExoPlayer player;
    private MediaLibrarySession mediaLibrarySession;
    private DownloadCatalog catalog;

    @Override
    public void onCreate() {
        super.onCreate();
        catalog = new DownloadCatalog(this);
        player = new ExoPlayer.Builder(this).build();
        mediaLibrarySession = new MediaLibrarySession.Builder(this, player, libraryCallback).build();
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaLibrarySession;
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        int result = super.onStartCommand(intent, flags, startId);
        if (intent != null && ACTION_PLAY_DOWNLOAD.equals(intent.getAction())) {
            String trackId = intent.getStringExtra(EXTRA_TRACK_ID);
            playDownloadedTrack(trackId);
        }
        return result;
    }

    @Override
    public void onDestroy() {
        if (mediaLibrarySession != null) {
            mediaLibrarySession.release();
            mediaLibrarySession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    private final MediaLibrarySession.Callback libraryCallback = new MediaLibrarySession.Callback() {
        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            @Nullable LibraryParams params
        ) {
            return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params));
        }

        @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String parentId,
            int page,
            int pageSize,
            @Nullable LibraryParams params
        ) {
            List<MediaItem> items = new ArrayList<>();

            if (ROOT_ID.equals(parentId)) {
                items.add(downloadsFolderItem());
            } else if (DOWNLOADS_ID.equals(parentId)) {
                for (DownloadCatalog.DownloadedTrack track : catalog.getTracks()) {
                    items.add(toMediaItem(track));
                }
            }

            return Futures.immediateFuture(LibraryResult.ofItemList(pageItems(items, page, pageSize), params));
        }

        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String mediaId
        ) {
            if (ROOT_ID.equals(mediaId)) {
                return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), null));
            }
            if (DOWNLOADS_ID.equals(mediaId)) {
                return Futures.immediateFuture(LibraryResult.ofItem(downloadsFolderItem(), null));
            }

            DownloadCatalog.DownloadedTrack track = catalog.getTrack(mediaId);
            if (track == null) {
                return Futures.immediateFuture(LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE));
            }
            return Futures.immediateFuture(LibraryResult.ofItem(toMediaItem(track), null));
        }

        @Override
        public ListenableFuture<LibraryResult<Void>> onSearch(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String query,
            @Nullable LibraryParams params
        ) {
            List<MediaItem> results = searchItems(query);
            session.notifySearchResultChanged(browser, query, results.size(), params);
            return Futures.immediateFuture(LibraryResult.ofVoid(params));
        }

        @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetSearchResult(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String query,
            int page,
            int pageSize,
            @Nullable LibraryParams params
        ) {
            return Futures.immediateFuture(
                LibraryResult.ofItemList(pageItems(searchItems(query), page, pageSize), params)
            );
        }

        @Override
        public ListenableFuture<List<MediaItem>> onAddMediaItems(
            MediaSession session,
            MediaSession.ControllerInfo controller,
            List<MediaItem> mediaItems
        ) {
            List<MediaItem> resolvedItems = new ArrayList<>();
            for (MediaItem item : mediaItems) {
                DownloadCatalog.DownloadedTrack track = catalog.getTrack(item.mediaId);
                if (track != null) {
                    resolvedItems.add(toMediaItem(track));
                }
            }
            return Futures.immediateFuture(resolvedItems);
        }
    };

    private List<MediaItem> searchItems(String query) {
        List<MediaItem> results = new ArrayList<>();
        String normalizedQuery = query == null ? "" : query.toLowerCase(Locale.US).trim();

        for (DownloadCatalog.DownloadedTrack track : catalog.getTracks()) {
            if (normalizedQuery.isEmpty() || matches(track, normalizedQuery)) {
                results.add(toMediaItem(track));
            }
        }

        return results;
    }

    private boolean matches(DownloadCatalog.DownloadedTrack track, String normalizedQuery) {
        return contains(track.title, normalizedQuery)
            || contains(track.artistName, normalizedQuery)
            || contains(track.albumTitle, normalizedQuery)
            || contains(track.genre, normalizedQuery);
    }

    private boolean contains(String value, String normalizedQuery) {
        return value != null && value.toLowerCase(Locale.US).contains(normalizedQuery);
    }

    private void playDownloadedTrack(@Nullable String trackId) {
        if (trackId == null || player == null) return;

        DownloadCatalog.DownloadedTrack track = catalog.getTrack(trackId);
        if (track == null) return;

        player.setMediaItem(toMediaItem(track));
        player.prepare();
        player.play();
    }

    private MediaItem rootItem() {
        return new MediaItem.Builder()
            .setMediaId(ROOT_ID)
            .setMediaMetadata(
                new MediaMetadata.Builder()
                    .setTitle(getString(getApplicationInfo().labelRes))
                    .setIsBrowsable(true)
                    .setIsPlayable(false)
                    .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                    .build()
            )
            .build();
    }

    private MediaItem downloadsFolderItem() {
        return new MediaItem.Builder()
            .setMediaId(DOWNLOADS_ID)
            .setMediaMetadata(
                new MediaMetadata.Builder()
                    .setTitle("Downloads")
                    .setSubtitle("Offline tracks")
                    .setIsBrowsable(true)
                    .setIsPlayable(false)
                    .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_PLAYLISTS)
                    .build()
            )
            .build();
    }

    private MediaItem toMediaItem(DownloadCatalog.DownloadedTrack track) {
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
            .setTitle(track.title)
            .setArtist(track.artistName)
            .setAlbumTitle(track.albumTitle)
            .setGenre(track.genre)
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
            .setDurationMs(track.duration * 1000);

        Uri artworkUri = firstAvailableUri(track.artworkUri, track.coverImageUrl);
        if (artworkUri != null) {
            metadata.setArtworkUri(artworkUri);
        }

        return new MediaItem.Builder()
            .setMediaId(track.id)
            .setUri(Uri.parse(track.fileUri))
            .setMimeType(track.mimeType == null || track.mimeType.isEmpty() ? null : track.mimeType)
            .setMediaMetadata(metadata.build())
            .build();
    }

    private ImmutableList<MediaItem> pageItems(List<MediaItem> items, int page, int pageSize) {
        if (page < 0 || pageSize <= 0) {
            return ImmutableList.copyOf(items);
        }

        int fromIndex = page * pageSize;
        if (fromIndex >= items.size()) {
            return ImmutableList.of();
        }

        int toIndex = Math.min(fromIndex + pageSize, items.size());
        return ImmutableList.copyOf(items.subList(fromIndex, toIndex));
    }

    @Nullable
    private Uri firstAvailableUri(String localUri, String remoteUri) {
        if (localUri != null && !localUri.isEmpty()) {
            Uri uri = Uri.parse(localUri);
            String path = uri.getPath();
            if (path != null) {
                File file = new File(path);
                if (file.exists()) {
                    return uri;
                }
            }
        }
        if (remoteUri != null && !remoteUri.isEmpty()) {
            return Uri.parse(remoteUri);
        }
        return null;
    }
}
