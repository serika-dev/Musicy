# Changelog — Musicy Mobile

All notable changes to the native Android and iOS apps. Dates are the app's
version bumps, not calendar releases. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

The native apps live in `mobile/android` (Kotlin, Jetpack Compose, Media3) and
`mobile/iOS` (SwiftUI, AVPlayer). They replaced the earlier Capacitor WebView
wrapper, which has been removed from the repository.

---

## [1.7.1]

### Fixed
- **No more startup freeze with large download libraries.** The download index was scanned on the main thread before the app could draw anything; with a few hundred downloads that stalled startup long enough to trigger system ANR dialogs. The scan now runs in the background and playback paths wait for it instead, so downloaded files are still played from disk.
- **Offline playback requests no longer crash.** Queue resolution (player, notification, Android Auto) now degrades gracefully offline: catalogue lookups that used to throw out of the media-session callbacks fall back to the already-resolved queue.
- **A corrupt preferences file no longer kills the app on launch** — settings fall back to defaults and recover on the next good read.
- **Lock-screen lyrics** no longer race the queue when replacing the current media item.
- **Synced lyrics with repeated timestamps** (choruses) no longer crash the lyrics list.
- **Downloads hygiene.** Partial `.part` files are swept instead of showing up as phantom "Offline track" entries; switching download quality now removes the previous rendition instead of leaving an orphaned file; deleting a download removes every saved copy of that track.

---

## [1.7.0]

### Added
- **Continue listening** on Home, plus a 4×2 Android home-screen widget for resume / Liked Songs / last daily mix.
- **Artist albums/singles filter**, sort by year or name, and a Radio chip that shuffles the whole catalogue.
- **Multi-select download.** Long-press a track (or pick Select in the overflow menu) to tick several songs and download them together.
- **Download progress notification** and a clearer downloaded badge on every track row.
- **Lock-screen lyrics.** Now-playing metadata includes lyrics so the lock screen and Android Auto can show them.
- **Quality-aware downloads.** Already-saved tracks at the same quality are skipped; a different quality replaces the file.

### Changed
- **Musicy Connect** now hands the full queue (not just one track) between web and the apps, keeps shuffle/repeat in sync, and heartbeats faster while playing.

---

## [1.6.1]

### Changed
- **Collapsing detail titles.** Artist/album names no longer sit on top of the track list while you scroll — the app bar stays clear until the hero is off-screen, then the title fades in with a solid background.
- **Album viewer.** Artist pages show a 2-column album grid (not a thin carousel). View all opens a full cover grid. Home/library "View all" pages use the same grid for albums, artists, playlists and mixes.
- **View all** labels and headers with counts, instead of a bare list of rows.
- **Library and Home album grids.** Library → Albums is a 2-column cover wall; followed artists are a 3-column grid; Home new releases and search albums use the same viewer.

---

## [1.6.0]

### Fixed
- **Artist pages now list every song.** Popular still shows the top ten, but Play / Shuffle / Download all use the full catalogue (including features), and a **See all songs** screen pages through the rest. Previously the app capped the list at 10, so big catalogues like KAF or Yama looked empty after a handful of tracks.
- **Downloads that "vanished" come back.** The Android index lived only in DataStore; if that file corrupted or was wiped on an update, the Downloads screen went blank even though the audio was still on disk. The index is now written next to the files (and as a per-track sidecar) and rebuilt from the directory on launch, matching iOS.

### Added
- **Offline mode** — play downloads only and browse the saved library with no network.
- **Data saver** — smallest streams, skip extra artwork on cellular.
- **Lossless / High / Auto listening modes** in Settings, used for both streaming and downloads.
- **Save library for offline** — caches home, liked songs, playlists, followed artists and their catalogues so the app keeps working without Wi-Fi.
- **Stream on mobile data** toggle, plus an offline banner when the radio is down.

---

## [1.5.1]

### Fixed
- **iOS downloads now use the server proxy** instead of hitting B2/R2 directly.
  This fixes CORS failures and ensures auth headers and quality selection work.
- **Android downloads now pass the quality parameter** so downloads respect the
  user's audio quality setting (previously always downloaded the original).
- **Download file extension extraction fixed** on Android — URLs with query
  parameters no longer produce invalid file extensions.
- **Dedicated download HTTP client** with 5-minute timeout on both platforms
  prevents large FLAC files from timing out mid-download.
- **Album genre filter now works** — the albums API endpoint was ignoring the
  `genre` query parameter; it now filters by genre as expected.
- **Album detail API now supports mobile auth** — previously only web sessions
  and API keys were checked, so mobile clients couldn't see file paths for
  private albums.
- **Tracks without `filePath` are now playable** — the stream endpoint looks up
  tracks by ID server-side, so the client no longer needs `filePath` to
  construct the streaming URL. This fixes albums/playlists where some tracks
  had masked file paths.
- **Download quality fallback** — if a specific quality rendition doesn't
  exist, the download endpoint now falls back to the next available tier
  (matching the stream endpoint's behavior).

---

## [1.5.0]

### Fixed
- **Follow status now works on mobile.** The artist detail API was checking
  follow state via web session only, so mobile clients (API key auth) always
  saw `isFollowing: false`. The route now checks both web and mobile auth.
- **Artist banners now display.** `bannerUrl` was missing from the API
  response on artist detail, artist list, and followed-artists endpoints.
  Both Android (`DetailHero`) and iOS (`ArtistDetailView`) now render the
  banner image with a gradient fade into the background.
- **iOS followed artists list stays in sync.** `LibraryStore.setFollowing`
  now adds the artist to `followedArtists` when following (previously only
  removed on unfollow).

### Added
- **Admin rendition backfill endpoint** (`POST /api/admin/renditions`) to
  generate multi-quality audio renditions for all tracks missing them.
  `GET /api/admin/renditions` returns coverage stats.

---

## [1.4.0]

### Added
- **Downloads that actually work everywhere.** A **Download / Remove download**
  action is now in the track overflow menu, and **Download all** on albums,
  playlists and Liked Songs — each with live spinner → "done" state.
  - Android: reactive `downloadedIds`/`downloadingIds` in the view model drive
    every download control, so saving from one place updates them all at once.
  - iOS: a brand-new offline subsystem (`DownloadStore`) — previously the phone
    could only stream. Files land in Application Support with a JSON index, the
    player prefers a local copy when present (true offline playback), and the
    now-playing screen gets a download toggle.

---

## [1.3.0]

### Added
- **Fullscreen big-player lyrics** on both platforms — lyrics take over the
  screen, the active line stays centered, and transport stays at the bottom.
- **Sleep timer** (5–90 minutes or "end of this track"), counted down inside
  the playback service so it survives the app being closed. Reachable from the
  player menu, a Sleep button, and Settings.
- **Pull-to-refresh** on Home and Library (Android) — reloads in place without
  flashing the loading skeletons.
- **Screen transition animations** (Android) — fade-and-scale on push/pop and a
  slide-up for the player; collapses to a quick fade under Reduced Motion.
- **Search history** — the last dozen queries, kept per device, cleared on
  sign-out.
- **System equaliser** (Android) — Settings opens the phone's own equaliser
  against the session Musicy is playing on.
- **Speed & volume sheet** and an **up-next preview** on the player.
- **Artwork tinting** (Android) — the player gradient and mini-player take the
  cover's dominant colour, clamped dark/desaturated for legible text.
- **Swipe gestures** — artwork/mini-player swipe sideways to change track, down
  to dismiss, up to open the full player; long-press a track or card for its
  menu.
- **Prefetching & caching** (Android) — one app-wide image loader with a 256 MB
  disk cache and a large memory cache; the next two covers are prefetched.

### Changed
- **Lyric behaviour matched to the web big player**: nothing is highlighted
  before the first line (was clamped to line one during the intro); blank
  instrumental lines render blank; the active line animates (grows, brightens,
  soft glow, ~0.45s ease) instead of snapping.
- **Lyric timing** is now frame-accurate — the playhead is extrapolated between
  the quarter-second session reports using the wall clock and playback speed.
- **Bottom-tab navigation** resets to the tab root on tap, instead of restoring
  a drilled-in detail screen (tapping Home showed an album before).
- Album art crossfades in instead of popping; the scrubber ticks at 250 ms.
- Long titles marquee-scroll (off under Reduced Motion).

### Fixed
- **APK updates.** Every build is signed with a committed stable key
  (`mobile/android/app/musicy.keystore`) instead of a per-machine debug key,
  which was causing Android to reject updates with a signature mismatch. One
  fresh install is needed to cross over from an old throwaway-signed build.
- **Lyrics auto-scroll never ran** — the scroll effect was keyed on
  `isScrollInProgress`, which its own programmatic scroll tripped, cancelling
  the scroll before it moved. It now keys on the active-line index; only a real
  finger-drag pauses it.
- End-of-track sleep timer left its indicator armed after firing.

---

## [1.2.0]

### Added
- **Real playback** on both platforms — one shared audio engine driving the
  in-app UI, the system notification / lock screen, headset buttons and the
  car. Queue, shuffle, repeat, seek, gapless-ish autoplay, play-history
  scrobbling. (The player was previously non-functional.)
- **Full catalogue** — home feed, search, genre categories, albums, artists,
  playlists, daily mixes, liked songs, recently played, followed artists, and
  "see all" index pages.
- **Musicy Connect** multi-device sync — the phone joins the same device bus as
  the browser; playback can be claimed here or handed to another device, and
  remote transport works both ways.
- **Android Auto / CarPlay** browse trees — Home, Library, Albums, Artists,
  Playlists, Genres, Liked Songs, Recently Played.
- **Synced + plain lyrics** (LRClib) with romanization (replace or alongside)
  and tap-to-seek.
- **Offline downloads** (Android) that play from local storage.
- ~20 **settings**, split device-local vs account-synced; account-scoped values
  round-trip through `/api/user/settings` so they follow the user to the web
  app and survive a reinstall.
- **Haptic feedback** on transport controls.

### Changed
- Web-matching dark violet design, ported from the web app's tokens.
- Playhead split into its own flow so screens don't recompose twice a second;
  queue no longer rebuilt on every position tick; download lookups moved off
  the main thread; home/library fetches parallelised.

### Fixed
- **App never appeared in Android Auto** — two independent manifest faults
  (a stray `minCarApiLevel`, and the automotive descriptor) either of which was
  fatal.
- Server API-key auth enabled on the endpoints the apps need
  (`getAuthSession` accepting a Bearer key), without exposing password change.
- Media3 1.3 notification-provider API, DataStore transform typing, and several
  iOS Swift concurrency / type issues.

### CI
- Android and iOS GitHub Actions workflows: branch triggers, `workflow_dispatch`,
  concurrency groups, artifact upload with `if-no-files-found: error`. The debug
  APK is published as an artifact on every Android run.

---

## Removed (repository cleanup)
- The legacy **Capacitor WebView wrapper** — the top-level `android/` project,
  `native-shell/`, `capacitor.config.ts`, the `native:*` npm scripts, and the
  `@capacitor/cli` / `@capacitor/android` build-tooling dependencies. The web
  app's in-page Capacitor bridge (`@capacitor/core`, `splash-screen`,
  `status-bar`) is retained, as `src/` still imports it.
