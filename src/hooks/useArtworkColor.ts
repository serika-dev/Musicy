"use client";

import { useEffect, useState } from "react";
import { extractColorsFromImage } from "@/lib/color-extractor";

// Artwork URLs repeat constantly (queue, shelves), so remember each result.
const cache = new Map<string, string | null>();

/**
 * Dominant colour of an artwork image as a CSS colour, or null while loading /
 * when it can't be read (e.g. a host without CORS headers).
 */
export function useArtworkColor(url: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(() =>
    url ? (cache.get(url) ?? null) : null,
  );

  useEffect(() => {
    if (!url) {
      setColor(null);
      return;
    }
    if (cache.has(url)) {
      setColor(cache.get(url) ?? null);
      return;
    }
    let cancelled = false;
    extractColorsFromImage(url)
      .then((palette) => {
        cache.set(url, palette.primary);
        if (!cancelled) setColor(palette.primary);
      })
      .catch(() => {
        cache.set(url, null);
        if (!cancelled) setColor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}
