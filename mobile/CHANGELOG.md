# Changelog — Musicy Mobile

All notable changes to the native Android and iOS apps. Dates are the app's
version bumps, not calendar releases. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

The native apps live in `mobile/android` (Kotlin, Jetpack Compose, Media3) and
`mobile/iOS` (SwiftUI, AVPlayer). They replaced the earlier Capacitor WebView
wrapper, which has been removed from the repository.

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
