import type { Track } from "@/types/track";

/** Best available artwork URL for a track (track art > album art). */
export function getTrackArtwork(
  track: Track | null | undefined,
): string | null {
  if (!track) return null;
  return track.coverImageUrl || track.album?.coverImageUrl || null;
}
