// Shared settings schema between client & server
export interface UserSettings {
  // Lyrics
  autoRomanizeLyrics: boolean
  romanizeLanguage: "auto" | "ja" | "ko" | "hi"
  showRomanizationAlongside: boolean

  // Appearance
  theme: "dark" | "light" | "system"
  reducedMotion: boolean
  compactMode: boolean

  // Audio
  audioQuality: "auto" | "low" | "medium" | "high" | "lossless"
  crossfadeSeconds: number
  normalizeVolume: boolean
  defaultVolume: number

  // Playback
  autoplayRecommendations: boolean
  gaplessPlayback: boolean

  // Notifications
  showNowPlayingNotifications: boolean
  notifyOnNewReleases: boolean

  // Privacy
  privateSession: boolean
  allowScrobbling: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  autoRomanizeLyrics: false,
  romanizeLanguage: "auto",
  showRomanizationAlongside: false,

  theme: "dark",
  reducedMotion: false,
  compactMode: false,

  audioQuality: "auto",
  crossfadeSeconds: 0,
  normalizeVolume: false,
  defaultVolume: 1,

  autoplayRecommendations: true,
  gaplessPlayback: true,

  showNowPlayingNotifications: false,
  notifyOnNewReleases: true,

  privateSession: false,
  allowScrobbling: true,
}

export function mergeSettings(partial: Partial<UserSettings> | undefined | null): UserSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) }
}
