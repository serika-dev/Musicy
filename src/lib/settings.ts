import { prisma } from "@/lib/db";

export interface SystemSettingsConfig {
  ALLOW_REGISTRATION: boolean;
  PUBLIC_API_ACCESS: boolean;
  MAINTENANCE_MODE: boolean;
  ALLOW_ANONYMOUS_PLAYBACK: boolean;
  REQUIRE_EMAIL_VERIFICATION: boolean;
  SITE_NAME: string;
  DEFAULT_AUDIO_QUALITY: string;
}

export const DEFAULT_SETTINGS: SystemSettingsConfig = {
  ALLOW_REGISTRATION: true,
  PUBLIC_API_ACCESS: true,
  MAINTENANCE_MODE: false,
  ALLOW_ANONYMOUS_PLAYBACK: true,
  REQUIRE_EMAIL_VERIFICATION: false,
  SITE_NAME: "Serika Music",
  DEFAULT_AUDIO_QUALITY: "FLAC_LOSSLESS",
};

/** Known canonical keys (uppercase). */
const CANONICAL_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

function getModel() {
  return (
    (prisma as any).systemSetting ||
    (prisma as any).system_setting ||
    (prisma as any).SystemSetting ||
    null
  );
}

/**
 * Fetch a single system setting value by key with case-insensitive lookup & fallback defaults
 */
export async function getSystemSetting(key: string, defaultValue?: string): Promise<string> {
  const defaultVal =
    defaultValue ??
    (DEFAULT_SETTINGS[key as keyof SystemSettingsConfig] !== undefined
      ? String(DEFAULT_SETTINGS[key as keyof SystemSettingsConfig])
      : "true");

  try {
    const model = getModel();
    if (!model) return defaultVal;

    const setting = await model.findFirst({
      where: {
        OR: [
          { key: key },
          { key: key.toUpperCase() },
          { key: key.toLowerCase() },
        ],
      },
    });

    return setting?.value ?? defaultVal;
  } catch (error) {
    console.error(`Error loading system setting [${key}]:`, error);
    return defaultVal;
  }
}

/**
 * Fetch all system settings as a clean key-value map.
 * Keys are always returned in UPPERCASE so consumers never need to guess.
 * If both "ALLOW_REGISTRATION" and "allow_registration" exist in the DB,
 * the UPPERCASE row wins and the stale lowercase row is deleted in the background.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  try {
    const model = getModel();

    const settingsMap: Record<string, string> = {};

    // Populate with defaults first (all uppercase)
    Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => {
      settingsMap[k] = String(v);
    });

    if (!model) return settingsMap;

    const dbSettings: { key: string; value: string }[] = await model.findMany();

    // Group rows by their uppercase normalised key.
    // Prefer the row whose actual key is already uppercase (canonical).
    const grouped = new Map<string, { key: string; value: string; isCanonical: boolean }>();
    const staleKeys: string[] = [];

    for (const row of dbSettings) {
      const upper = row.key.toUpperCase();
      const isCanonical = row.key === upper;
      const existing = grouped.get(upper);

      if (!existing) {
        grouped.set(upper, { key: row.key, value: row.value, isCanonical });
      } else if (isCanonical && !existing.isCanonical) {
        // This row is the canonical uppercase key — it wins.
        staleKeys.push(existing.key);
        grouped.set(upper, { key: row.key, value: row.value, isCanonical });
      } else if (!isCanonical && existing.isCanonical) {
        // Existing is canonical, this one is stale.
        staleKeys.push(row.key);
      }
    }

    // Apply grouped values
    for (const [upper, entry] of grouped) {
      settingsMap[upper] = entry.value;
    }

    // Fire-and-forget: clean up stale lowercase duplicates
    if (staleKeys.length > 0) {
      Promise.all(
        staleKeys.map((k) =>
          model.delete({ where: { key: k } }).catch(() => {})
        )
      ).catch(() => {});
    }

    return settingsMap;
  } catch (error) {
    console.error("Error fetching all system settings:", error);
    return Object.entries(DEFAULT_SETTINGS).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {}
    );
  }
}

