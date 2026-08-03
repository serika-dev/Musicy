# Musicy Mobile

Native mobile apps for Musicy. Both apps are first-class native clients with a shared dark, violet-accented design inspired by the Musicy web app.

## Structure

- `android/` — Kotlin + Jetpack Compose app with Android Auto support.
- `iOS/` — SwiftUI iOS app with CarPlay support.

## Features

- **Self-hosted / custom endpoint** — On first launch each app asks for a server URL and an API key. This lets the same app connect to any Musicy instance, including self-hosted ones.
- **Native playback** — Android uses ExoPlayer, iOS uses `AVPlayer`.
- **Home, Search, Library, and Player screens**.
- **Android Auto / CarPlay** — Browse Daily Mixes, Albums, Artists, Playlists, and Liked Songs directly from the car UI.
- **API key authentication** — Uses Musicy's existing API-key support for native clients.

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

### Android Auto

The `MusicyPlaybackService` is a `MediaBrowserServiceCompat` that exposes the root catalogue to Android Auto via the `automotive_app_desc.xml` manifest declaration. The service uses the configured endpoint and API key from DataStore.

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

### CarPlay

The app declares a `CPTemplateApplicationSceneSessionRoleApplication` scene in `Info.plist` with `CarPlaySceneDelegate` as the delegate. The delegate builds a list-based browse UI and uses the shared `AudioPlayer` for playback.

> Note: CarPlay entitlements (`com.apple.developer.carplay-audio`) are required to run on a physical device; the iOS Simulator build does not enforce them.

## CI

- `.github/workflows/mobile-android.yml` builds the Android APK on every push/PR touching `mobile/android/**`.
- `.github/workflows/mobile-ios.yml` generates the Xcode project and builds the iOS app on a macOS runner.
- `.github/workflows/mobile-release.yml` can be triggered manually to build release artifacts.

## API support

The mobile clients consume the same public and authenticated endpoints as the web app:

- `GET /api/settings/public` — health / availability check
- `GET /api/daily-mixes`
- `GET /api/albums`, `GET /api/albums/{id}`
- `GET /api/artists`, `GET /api/artists/{id}/tracks`
- `GET /api/playlists`, `GET /api/playlists/{id}`
- `GET /api/search`
- `GET /api/tracks/{id}`, `POST /api/track/play`
- `GET /api/tracks/{id}/lyrics`
- `GET /api/user/liked-songs`

Authenticated calls send `Authorization: Bearer <api-key>`.
