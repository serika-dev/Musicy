"use client";

import { useEffect, useRef } from "react";

import { useMusicPlayer } from "@/contexts/music-player-context";
import {
  type LyricsData,
  type ParsedLyricLine,
  parseSyncedLyrics,
  useLyrics,
} from "@/hooks/useLyrics";
import { useRomanizedLyrics } from "@/hooks/useRomanizedLyrics";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

function sanitizeForCSS(text: string): string {
  return text
    .replace(/['"\\/[\](){}:;.,!?@#$%^&*+=|`~<>]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase()
    .substring(0, 50);
}

/** Lightweight check used by the parent to decide whether to show the toggle. */
export function useHasLyrics(trackId: string | undefined): boolean {
  const { data } = useLyrics(trackId);
  const typed = data as LyricsData | undefined;
  return Boolean(typed && (typed.plainLyrics || typed.syncedLyrics));
}

interface LyricsViewProps {
  variant: "mobile" | "desktop";
  /** "left" = Spotify-style block of left-aligned bold lines, no glow. */
  align?: "center" | "left";
  className?: string;
}

export function LyricsView({ variant, align = "center", className }: LyricsViewProps) {
  const left = align === "left";
  const { currentTrack, currentTime, seekTo } = useMusicPlayer();
  const { settings } = useSettings();
  const isMobile = variant === "mobile";
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: lyricsData } = useLyrics(currentTrack?.id);
  const lyricsTyped = lyricsData as LyricsData | undefined;
  const parsedSyncedLyrics: ParsedLyricLine[] = lyricsTyped?.syncedLyrics
    ? parseSyncedLyrics(lyricsTyped.syncedLyrics)
    : [];

  const lyricsWithIds: (ParsedLyricLine & { id: string })[] =
    parsedSyncedLyrics.map((line, index) => ({
      ...line,
      id: `${currentTrack?.id}-${index}-${line.time}-${sanitizeForCSS(line.text)}`,
    }));

  let currentLyricIndex = -1;
  for (let i = 0; i < lyricsWithIds.length; i++) {
    if (lyricsWithIds[i].time <= currentTime) currentLyricIndex = i;
    else break;
  }
  const currentLyricId =
    currentLyricIndex >= 0 ? lyricsWithIds[currentLyricIndex]?.id : undefined;

  const romanizeEnabled = settings.autoRomanizeLyrics;

  const { data: romanizedSyncedLrc } = useRomanizedLyrics(
    currentTrack?.id,
    "synced",
    romanizeEnabled && lyricsWithIds.length > 0,
    settings.romanizeLanguage,
  );
  const { data: romanizedPlain } = useRomanizedLyrics(
    currentTrack?.id,
    "plain",
    romanizeEnabled && !!lyricsTyped?.plainLyrics && lyricsWithIds.length === 0,
    settings.romanizeLanguage,
  );

  const romanizedLinesMap = (() => {
    if (!romanizeEnabled || !romanizedSyncedLrc || lyricsWithIds.length === 0)
      return null;
    const parsed = parseSyncedLyrics(romanizedSyncedLrc);
    if (parsed.length === 0) return null;
    const byTime: Record<number, string> = {};
    parsed.forEach((p) => {
      byTime[Math.round(p.time * 100)] = p.text;
    });
    const map: Record<string, string> = {};
    lyricsWithIds.forEach((line) => {
      const key = Math.round(line.time * 100);
      if (byTime[key]) map[line.id] = byTime[key];
    });
    return Object.keys(map).length > 0 ? map : null;
  })();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentLyricId || container.clientHeight <= 0) return;
    const el = container.querySelector(`[data-lyric-id="${currentLyricId}"]`);
    if (el) {
      const target =
        (el as HTMLElement).offsetTop - container.clientHeight * 0.3;
      container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
  }, [currentLyricId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "no-scrollbar relative w-full overflow-y-auto",
        left ? "px-1" : isMobile ? "px-2" : "mx-auto max-w-5xl px-12",
        className,
      )}
      style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
    >
      <div
        className={cn(
          left ? "space-y-1 text-left" : "space-y-6 text-center",
          left ? "pt-4" : isMobile ? "pt-8" : "pt-32",
        )}
      >
        {lyricsWithIds.length > 0 ? (
          (() => {
            const maxLen = lyricsWithIds.reduce((m, l) => {
              const r = romanizedLinesMap?.[l.id];
              const t = romanizeEnabled && r && r !== l.text ? r : l.text;
              return Math.max(m, (t || "").length);
            }, 0);
            const sizeClass = left
              ? isMobile
                ? "text-2xl"
                : maxLen > 60
                  ? "text-2xl xl:text-3xl"
                  : "text-3xl xl:text-4xl"
              : maxLen > 80
                ? isMobile
                  ? "text-2xl"
                  : "text-3xl lg:text-4xl"
                : maxLen > 55
                  ? isMobile
                    ? "text-3xl"
                    : "text-4xl lg:text-5xl"
                  : maxLen > 35
                    ? isMobile
                      ? "text-4xl"
                      : "text-5xl lg:text-7xl"
                    : isMobile
                      ? "text-5xl"
                      : "text-6xl lg:text-8xl";
            return lyricsWithIds.map((line) => {
              const isCurrent = currentLyricId === line.id;
              const romanized = romanizedLinesMap?.[line.id];
              const showRomanized =
                romanizeEnabled && romanized && romanized !== line.text;
              const showBoth =
                showRomanized && settings.showRomanizationAlongside;
              return (
                <button
                  key={line.id}
                  type="button"
                  data-lyric-id={line.id}
                  onClick={() => seekTo(line.time)}
                  className={cn(
                    left
                      ? "block w-full break-words rounded-lg px-2 py-2 text-left font-bold leading-snug [overflow-wrap:anywhere] transition-colors duration-300"
                      : "block w-full break-words rounded-2xl px-4 py-6 text-center font-semibold leading-relaxed [overflow-wrap:anywhere] transition-all duration-500 lg:px-8",
                    sizeClass,
                    left
                      ? isCurrent
                        ? "text-white"
                        : "text-white/40 hover:text-white/70"
                      : isCurrent
                        ? "scale-[1.03] text-white drop-shadow-2xl"
                        : "text-white/35 hover:scale-[1.01] hover:text-white/60",
                  )}
                  style={{
                    textShadow:
                      isCurrent && !left
                        ? "0 0 40px rgba(255,255,255,0.85)"
                        : "none",
                  }}
                >
                  {showBoth ? (
                    <>
                      <span className="block">{line.text}</span>
                      <span className="mt-2 block break-words text-base font-normal italic opacity-70 [overflow-wrap:anywhere] md:text-xl">
                        {romanized}
                      </span>
                    </>
                  ) : showRomanized ? (
                    romanized
                  ) : (
                    line.text
                  )}
                </button>
              );
            });
          })()
        ) : lyricsTyped?.plainLyrics ? (
          <div
            className={cn(
              "whitespace-pre-wrap text-white/90",
              left ? "px-2 py-4 text-xl font-semibold leading-relaxed" : "mx-auto max-w-3xl py-10 text-2xl leading-loose",
            )}
          >
            {romanizeEnabled &&
            romanizedPlain &&
            romanizedPlain !== lyricsTyped.plainLyrics ? (
              settings.showRomanizationAlongside ? (
                <>
                  <div>{lyricsTyped.plainLyrics}</div>
                  <div className="mt-6 italic opacity-70">{romanizedPlain}</div>
                </>
              ) : (
                romanizedPlain
              )
            ) : (
              lyricsTyped.plainLyrics
            )}
          </div>
        ) : (
          <div className="py-10 text-xl text-white/60">No lyrics available</div>
        )}
        <div className={left ? "h-40" : isMobile ? "h-32" : "h-96"} />
      </div>
    </div>
  );
}
