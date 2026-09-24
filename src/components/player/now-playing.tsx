"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { BadgeCheck, ChevronDown, ListMusic, Mic2, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { LikeButton } from "@/components/shared/like-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useArtworkColor } from "@/hooks/useArtworkColor";
import { cn } from "@/lib/utils";
import { DeviceSwitcher } from "./device-switcher";
import { LyricsView, useHasLyrics } from "./lyrics-view";
import { PlayerControls } from "./player-controls";
import { QualityBadge } from "./quality-badge";
import { getTrackArtwork } from "./player-utils";
import { SeekBar } from "./seek-bar";
import { VolumeControl } from "./volume-control";

interface NowPlayingProps {
  isOpen: boolean;
  onClose: () => void;
}

type Panel = "lyrics" | "queue";

/**
 * Fills the free space and centres a cover that is always exactly square.
 * The slot is a size container, so the cover is min(slot width, slot height):
 * it shrinks to fit a short or narrow window instead of being squashed.
 */
function CoverSlot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 items-center justify-center", className)}
      style={{ containerType: "size" }}
    >
      <div
        className="relative aspect-square shrink-0 overflow-hidden rounded-lg shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function NowPlaying({ isOpen, onClose }: NowPlayingProps) {
  const { currentTrack, playbackContext, queue, currentIndex, playTrack } = useMusicPlayer();
  // Phones: artwork view or lyrics view. Desktop: which side panel is shown.
  const [mobileLyrics, setMobileLyrics] = useState(false);
  const [panel, setPanel] = useState<Panel>("lyrics");

  const hasLyrics = useHasLyrics(currentTrack?.id);
  const artwork = getTrackArtwork(currentTrack);
  const tint = useArtworkColor(isOpen ? artwork : null);

  if (!currentTrack || !isOpen) return null;

  const contextLabel =
    playbackContext?.type === "album"
      ? "album"
      : playbackContext?.type === "playlist"
        ? "playlist"
        : playbackContext?.type === "daily-mix"
          ? "mix"
          : null;
  const upNext = queue.slice(currentIndex + 1, currentIndex + 41);
  const sidePanel: Panel = panel === "lyrics" && !hasLyrics ? "queue" : panel;
  const showMobileLyrics = mobileLyrics && hasLyrics;

  // Spotify-style backdrop: the cover's own colour, deepening to near-black.
  const background = tint
    ? `linear-gradient(180deg, color-mix(in srgb, ${tint} 72%, #000) 0%, color-mix(in srgb, ${tint} 38%, #000) 45%, #0b0b0d 100%)`
    : "linear-gradient(180deg, #3b2a63 0%, #1a1426 45%, #0b0b0d 100%)";

  const cover = (sizes: string) =>
    artwork ? (
      <Image src={artwork} alt={currentTrack.title} fill sizes={sizes} className="object-cover" priority />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-white/10">
        <Music2 className="h-1/3 w-1/3 text-white/50" />
      </div>
    );

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="-ml-2 rounded-full text-white hover:bg-white/10"
        aria-label="Close player"
      >
        <ChevronDown className="!size-7" />
      </Button>
      <div className="min-w-0 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
          {contextLabel ? `Playing from ${contextLabel}` : "Now playing"}
        </p>
        {contextLabel && playbackContext?.name && (
          <p className="truncate text-[13px] font-bold text-white">{playbackContext.name}</p>
        )}
      </div>
      <span className="w-9" aria-hidden />
    </div>
  );

  const titleBlock = (size: "md" | "lg") => (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Link
          href={`/tracks/${currentTrack.id}`}
          onClick={onClose}
          className={cn(
            "block truncate font-bold text-white hover:underline",
            size === "lg" ? "text-3xl" : "text-2xl",
          )}
        >
          {currentTrack.title}
        </Link>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <Link
            href={`/artists/${currentTrack.artist.id}`}
            onClick={onClose}
            className="inline-flex min-w-0 items-center gap-1 truncate text-base text-white/70 hover:text-white hover:underline"
          >
            <span className="truncate">{currentTrack.artist.name}</span>
            {currentTrack.artist.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-300" />}
          </Link>
          <QualityBadge variant="immersive" className="shrink-0" />
        </div>
      </div>
      <LikeButton trackId={currentTrack.id} size="md" tone="onDark" className="shrink-0" />
    </div>
  );

  const queueList = (
    <div className="space-y-1">
      {upNext.length === 0 && (
        <p className="px-2 py-8 text-sm text-white/60">Nothing queued after this song.</p>
      )}
      {upNext.map((t) => {
        const art = getTrackArtwork(t);
        return (
          <button
            key={`${t.id}-${queue.indexOf(t)}`}
            type="button"
            onClick={() =>
              playTrack(
                t,
                queue,
                playbackContext?.type ? (playbackContext as Parameters<typeof playTrack>[2]) : undefined,
              )
            }
            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-white/10"
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-white/10">
              {art && <Image src={art} alt="" fill sizes="44px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-white">{t.title}</span>
              <span className="block truncate text-[13px] text-white/60">{t.artist.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="h-full max-h-full w-full max-w-full rounded-none border-0 bg-transparent p-0 sm:rounded-none [&>button.absolute]:hidden"
        forceMount
      >
        <DialogTitle asChild>
          <VisuallyHidden.Root>
            {currentTrack.title} - {currentTrack.artist.name}
          </VisuallyHidden.Root>
        </DialogTitle>
        <DialogDescription asChild>
          <VisuallyHidden.Root>Full screen player with playback controls and lyrics.</VisuallyHidden.Root>
        </DialogDescription>

        <div
          className="relative flex h-full w-full flex-col overflow-hidden text-white transition-[background] duration-700"
          style={{ background }}
        >
          {/* ---------------- Phones / tablets ---------------- */}
          <div className="flex h-full w-full flex-col px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-[max(env(safe-area-inset-top),14px)] lg:hidden">
            {header}

            {showMobileLyrics ? (
              <div className="flex min-h-0 flex-1 flex-col pt-4">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md shadow-lg">
                    {cover("48px")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{currentTrack.title}</p>
                    <p className="truncate text-sm text-white/70">{currentTrack.artist.name}</p>
                  </div>
                  <LikeButton trackId={currentTrack.id} tone="onDark" />
                </div>
                <LyricsView variant="mobile" align="left" className="min-h-0 flex-1" />
                <div className="shrink-0 pt-3">
                  <SeekBar variant="immersive" showTimes remaining />
                  <PlayerControls variant="immersive" size="md" showToggles className="mt-3 justify-between" />
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileLyrics(false)}
                      aria-label="Hide lyrics"
                      aria-pressed
                      className="rounded-full bg-white/15 text-white hover:bg-white/25"
                    >
                      <Mic2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Short screens (phones in landscape) put the cover beside the
              // controls, so it keeps real space instead of shrinking to nothing.
              <div className="flex min-h-0 flex-1 flex-col [@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-center [@media(max-height:520px)]:gap-6">
                <CoverSlot className="py-6 [@media(max-height:520px)]:h-full [@media(max-height:520px)]:py-3">
                  {cover("(max-width: 1024px) 90vw, 480px")}
                </CoverSlot>
                <div className="shrink-0 [@media(max-height:520px)]:min-w-0 [@media(max-height:520px)]:flex-1">
                  {titleBlock("md")}
                  <SeekBar variant="immersive" showTimes remaining className="mt-5" />
                  <PlayerControls variant="immersive" size="lg" showToggles className="mt-3 justify-between" />
                  <div className="mt-4 flex items-center justify-between">
                    <DeviceSwitcher variant="immersive" />
                    <div className="flex items-center gap-1">
                      <DownloadButton track={currentTrack} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileLyrics(true)}
                        disabled={!hasLyrics}
                        aria-label="Show lyrics"
                        className="rounded-full text-white hover:bg-white/10 disabled:opacity-30"
                      >
                        <Mic2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Desktop ---------------- */}
          <div className="hidden h-full w-full flex-col px-10 pb-8 pt-6 lg:flex">
            {header}
            <div className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-16 pt-6 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
              {/* Player column */}
              <div className="flex min-h-0 flex-col">
                <CoverSlot className="pb-7">{cover("480px")}</CoverSlot>
                <div className="shrink-0">{titleBlock("lg")}</div>
                <SeekBar variant="immersive" showTimes className="mt-5 shrink-0" />
                <PlayerControls variant="immersive" size="lg" showToggles className="mt-2 shrink-0 justify-between" />
                <div className="mt-4 flex shrink-0 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DeviceSwitcher variant="immersive" />
                    <DownloadButton track={currentTrack} />
                  </div>
                  <VolumeControl variant="immersive" />
                </div>
              </div>

              {/* Side panel: lyrics or up next */}
              <div className="flex min-h-0 flex-col">
                <div className="flex shrink-0 gap-2" role="tablist" aria-label="Side panel">
                  {(
                    [
                      { id: "lyrics", label: "Lyrics", icon: Mic2, disabled: !hasLyrics },
                      { id: "queue", label: "Up next", icon: ListMusic, disabled: false },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={sidePanel === tab.id}
                      disabled={tab.disabled}
                      onClick={() => setPanel(tab.id)}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40",
                        sidePanel === tab.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div
                  className="mt-4 min-h-0 flex-1 overflow-y-auto no-scrollbar"
                  style={{
                    maskImage: "linear-gradient(180deg, transparent 0, #000 24px, #000 calc(100% - 64px), transparent 100%)",
                  }}
                >
                  {sidePanel === "lyrics" ? (
                    <LyricsView variant="desktop" align="left" className="h-full" />
                  ) : (
                    <div className="pt-3">{queueList}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
