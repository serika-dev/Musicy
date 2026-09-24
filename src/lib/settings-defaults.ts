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

  // Onboarding
  onboardingCompleted: boolean
  /** Genres picked during onboarding; seeds recommendations before any likes. */
  favoriteGenres: string[]
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

  onboardingCompleted: false,
  favoriteGenres: [],
}

export function mergeSettings(partial: Partial<UserSettings> | undefined | null): UserSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) }
}

/** Keys that record account state rather than preferences; "reset" keeps them. */
export const ACCOUNT_STATE_KEYS = ["onboardingCompleted", "favoriteGenres"] as const

/** Defaults for every preference, leaving account-state keys as they are. */
export function resetPreferences(current: UserSettings): UserSettings {
  const next = { ...DEFAULT_SETTINGS }
  for (const k of ACCOUNT_STATE_KEYS) {
    ;(next as Record<string, unknown>)[k] = current[k]
  }
  return next
}
