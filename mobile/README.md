# Musicy Mobile

Native mobile apps for Musicy. Both are first-class native clients built to
match the web app: the same dark, violet-accented design, the same catalogue,
and the same multi-device playback hand-off.

## Structure

- `android/` — Kotlin + Jetpack Compose, Media3/ExoPlayer, Android Auto.
- `iOS/` — SwiftUI, `AVPlayer`, CarPlay.

## Features

- **Self-hosted / custom endpoint** — on first launch each app asks for a
  server URL and signs in, so the same build works against any Musicy
  instance. Credentials are an API key sent as `Authorization: Bearer …`.
- **Real playback** — one shared engine per app drives the in-app UI, the
  system notification / lock screen, headset buttons and the car. Queue,
  shuffle, repeat, seek, gapless-ish autoplay and play-history scrobbling.
- **Full catalogue** — home feed, search, genre categories, albums, artists
  (every song, not just the top ten), playlists, daily mixes, liked songs,
  recently played, followed artists and "see all" index pages for each.
- **Player** — artwork, scrubbing, queue editing, synced lyrics (LRCLib, the
  same source the web player uses) and device switching. The Android player
  tints itself to the cover art, scrolls long titles, swipes sideways to
  change track and down to dismiss, and previews what is up next.
- **Fullscreen lyrics** — a big-player lyrics view on both platforms that takes
  over the screen, centres the active line and keeps transport at the bottom.
- **Pull to refresh** — Home and Library reload in place without flashing the
  loading skeletons.
- **Sleep timer** — 5 to 90 minutes or "end of this track", counted down in
  the playback service so it keeps running with the app closed.
- **Recent searches** — the last dozen queries, kept on the device and
  cleared on sign-out.
- **System equaliser** — Settings hands your phone's own equaliser the audio
  session Musicy is playing on, rather than shipping a worse copy.
- **Musicy Connect** — the phone joins the same device bus as the browser, so
  playback can be claimed here or handed to another device, and remote
  transport commands work in both directions.
- **Android Auto / CarPlay** — browse Home, Library, Albums, Artists,
  Playlists, Genres, Liked Songs and Recently Played, then play a whole list
  or a single song from it. Android also supports assistant search.
- **Offline downloads** — saved tracks play from local storage with no
  network. The download index is rebuilt from disk if it ever goes missing.
- **Offline library** — Settings → Save library for offline caches metadata
  so Home, playlists, liked songs and artist catalogues keep working with the
  radio off. Offline mode and Data saver live in Settings too.
- **Listening modes** — Data saver, Auto, High, Lossless or Offline-only,
  applied to both streaming and downloads.

## Android

### Requirements

- Android Studio Ladybug or newer
- JDK 17
- Android SDK 34

### Build

```bash
cd mobile/android
./gradlew assembleDebug
```

If the Gradle wrapper is missing, install Gradle 8.7 and run `gradle wrapper` first.

### Signing and installable updates

Every build — debug and release — is signed with the committed key at
`app/musicy.keystore` (password `musicy123`, alias `musicy`). This is
deliberate: it is a self-hosted app, not a Play Store upload, and a stable key
is what lets a freshly-downloaded APK install *over* the previous one. The
default per-machine debug key changes between builds, which is what made
Android reject updates with a signature-mismatch error.

One-time step when moving from an older build: because past APKs were signed
with a throwaway key, the first install of a stably-signed APK will still be
refused as an update. Uninstall the old app once, install the new APK, and
every update after that lands in place.

### Architecture

| Piece | Role |
| --- | --- |
| `MusicyPlaybackService` | `MediaLibraryService` owning the one `ExoPlayer`, the browse tree and the sync client |
| `MusicyLibrary` | Browse nodes for Android Auto, plus the queue cache that turns one tapped song into its whole album |
| `PlayerConnection` | `MediaController` wrapper the Compose screens observe |
| `SyncClient` | SSE client for `/api/sync/stream`, publishing and receiving Connect events |
| `MusicyRepository` | Shared data access, liked-song cache, downloads and settings |

### Android Auto

The service declares both `androidx.media3.session.MediaLibraryService` and the
legacy `android.media.browse.MediaBrowserService` actions, and ships
`automotive_app_desc.xml` declaring `media`. Because the car attaches to the
same session as the app, playback started on the phone continues in the car and
vice versa.

Two manifest entries must **not** come back, as either one hides the app from
the car entirely:

- `androidx.car.app.minCarApiLevel` — marks the app as a Car App Library app,
  so the host looks for a `CarAppService`, finds none, and drops it.
- any `<uses>` value in `automotive_app_desc.xml` other than the documented
  ones — an unrecognised entry invalidates the whole descriptor.

#### Musicy isn't showing up in my car

If the app is sideloaded (an APK from CI rather than the Play Store), Android
Auto hides it until you allow unknown sources — this is a host setting, not
something the app can declare:

1. Open the **Android Auto** settings on the phone (Settings → Connected
   devices → Android Auto, or the standalone app on older versions).
2. Tap the **Version** row about ten times to unlock **Developer settings**.
3. From the ⋮ menu choose **Developer settings**, then enable
   **Unknown sources**.
4. Force-stop Android Auto and reconnect. Musicy appears in the car's app
   launcher.

If it appears but the browse list is empty, you are signed out — the car shows
a **Sign in** button that opens the phone app. Signing in there populates the
tree immediately.

## iOS

### Requirements

- macOS with Xcode 15+
- [xcodegen](https://github.com/yonaskolb/XcodeGen)

### Build

```bash
cd mobile/iOS
xcodegen generate
xcodebuild -scheme Musicy -destination 'platform=iOS Simulator,name=iPhone 15' clean build
```

### Architecture

| Piece | Role |
| --- | --- |
| `AudioPlayer` | Single `AVPlayer` engine: queue, auto-advance, seek, remote commands, now-playing info |
| `LibraryStore` | Shared app state — feed, playlists, liked-song set, profile |
| `SyncClient` | SSE client for Musicy Connect |
| `CarPlaySceneDelegate` | Browse templates mirroring the Android Auto tree |

### CarPlay

The app declares a `CPTemplateApplicationSceneSessionRoleApplication` scene in
`Info.plist` with `CarPlaySceneDelegate` as the delegate.

> Note: CarPlay entitlements (`com.apple.developer.carplay-audio`) are required
> to run on a physical device; the iOS Simulator build does not enforce them.

## CI

- `.github/workflows/mobile-android.yml` builds the Android APK on every push/PR touching `mobile/android/**`.
- `.github/workflows/mobile-ios.yml` generates the Xcode project and builds the iOS app on a macOS runner.
- `.github/workflows/mobile-release.yml` can be triggered manually to build release artifacts.

## API support

The mobile clients consume the same endpoints as the web app. Everything below
accepts an API key via `Authorization: Bearer <api-key>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/mobile/login`, `POST /api/auth/register`, `GET /api/user/profile` |
| Home | `GET /api/mobile/feed`, `GET /api/daily-mixes`, `GET /api/daily-mixes/{id}`, `GET /api/genres` |
| Catalogue | `GET /api/albums`, `/api/albums/{id}`, `/api/artists`, `/api/artists/{id}`, `/api/artists/{id}/tracks`, `/api/artists/{id}/albums`, `/api/tracks`, `/api/tracks/{id}`, `/api/tracks/{id}/lyrics`, `/api/search` |
| Library | `GET /api/mobile/liked-songs`, `POST`/`DELETE /api/user/liked-songs`, `GET /api/user/recently-played`, `GET /api/user/followed-artists`, `POST`/`DELETE /api/artists/{id}/follow` |
| Playlists | `GET`/`POST /api/playlists`, `GET /api/playlists/{id}`, `POST`/`DELETE /api/playlists/{id}/tracks` |
| Playback | `POST /api/track/play` |
| Connect | `GET /api/sync/stream`, `POST /api/sync/publish`, `GET /api/sync/devices` |

Several of these previously accepted only a NextAuth browser session. They now
go through `getAuthSession` in `src/lib/mobile-auth.ts`, which accepts either a
cookie session or a Bearer API key, so native clients get the same access the
web app has.

Password changes remain browser-only on purpose — an API key should not be able
to rotate the account password.
