package app.serika.musicy.mobile

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache

/**
 * Configures a single app-wide Coil image loader.
 *
 * The default loader keeps only a small memory cache and no disk cache, so
 * scrolling back to a cover already seen re-downloads it. A real disk cache and
 * a generous memory cache make the catalogue feel instant on a second look, and
 * a global crossfade means art fades in rather than popping.
 */
class MusicyApplication : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .crossfade(true)
            .memoryCache {
                MemoryCache.Builder(this)
                    // A quarter of the app's heap for decoded bitmaps: enough
                    // to keep a scrolled-past carousel warm.
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(256L * 1024 * 1024)
                    .build()
            }
            // Artwork URLs are content-addressed and effectively immutable, so
            // honouring no-cache headers would only throw away good cache hits.
            .respectCacheHeaders(false)
            .build()
}
