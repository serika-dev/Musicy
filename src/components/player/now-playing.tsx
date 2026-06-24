"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  BadgeCheck,
  ChevronDown,
  Mic2,
  Minimize2,
  Music2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { LikeButton } from "@/components/shared/like-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMusicPlayer } from "@/contexts/music-player-context";
import {
  extractColorsFromImage,
  generateGradientFromPalette,
  genreGradients,
} from "@/lib/color-extractor";
import { cn } from "@/lib/utils";
import { LyricsView, useHasLyrics } from "./lyrics-view";
import { PlayerControls } from "./player-controls";
import { getTrackArtwork } from "./player-utils";
import { SeekBar } from "./seek-bar";
import { VolumeControl } from "./volume-control";

interface NowPlayingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NowPlaying({ isOpen, onClose }: NowPlayingProps) {
  const { currentTrack } = useMusicPlayer();
  const [showLyrics, setShowLyrics] = useState(true);
  const [gradient, setGradient] = useState<string | null>(null);

  const hasLyrics = useHasLyrics(currentTrack?.id);
  const artwork = getTrackArtwork(currentTrack);

  useEffect(() => {
    if (!currentTrack || !isOpen) return;
    let cancelled = false;
    const run = async () => {
      if (artwork) {
        try {
          const palette = await extractColorsFromImage(artwork);
          if (!cancelled) setGradient(generateGradientFromPalette(palette));
          return;
        } catch {
          // fall through to genre gradient
        }
      }
      if (!cancelled)
        setGradient(
          genreGradients[currentTrack.genre || "default"] ||
            genreGradients.default,
        );
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentTrack, isOpen, artwork]);

  if (!currentTrack || !isOpen) return null;

  const showLyricsPane = showLyrics && hasLyrics;

  const cover = (sizes: string, className: string) =>
    artwork ? (
      <Image
        src={artwork}
        alt={currentTrack.title}
        fill
        sizes={sizes}
        className={className}
        priority
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-white/10">
        <Music2 className="h-1/3 w-1/3 text-white/50" />
      </div>
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="h-full max-h-full w-full max-w-full border-0 bg-transparent p-0 [&>button.absolute]:hidden"
        forceMount
      >
        <DialogTitle asChild>
          <VisuallyHidden.Root>
            {currentTrack.title} - {currentTrack.artist.name}
          </VisuallyHidden.Root>
        </DialogTitle>

        <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
          {artwork && (
            <div className="absolute inset-0 -z-10">
              <Image
                src={artwork}
                alt=""
                fill
                priority
                sizes="100vw"
                className="scale-150 object-cover opacity-50 blur-[64px]"
              />
            </div>
          )}
          <div
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background:
                gradient || "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
              mixBlendMode: "multiply",
            }}
          />
          <div className="absolute inset-0 bg-black/45" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-6 top-6 z-50 hidden text-white hover:bg-white/15 lg:flex"
          >
            <Minimize2 className="h-6 w-6" />
          </Button>

          {/* ---------------- Mobile ---------------- */}
          <div className="relative z-10 flex h-full w-full flex-col px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),20px)] lg:hidden">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="-ml-2 text-white hover:bg-white/15"
                aria-label="Minimize"
              >
                <ChevronDown className="h-7 w-7" />
              </Button>
              <span className="truncate px-4 text-xs font-bold uppercase tracking-widest text-white/80">
                Now Playing
              </span>
              <span className="h-9 w-9" />
            </div>

            {showLyricsPane ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex shrink-0 items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/30 shadow-xl">
                    {cover("56px", "object-cover")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-white">
                      {currentTrack.title}
                    </h3>
                    <p className="truncate text-sm text-white/70">
                      {currentTrack.artist.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLyrics(false)}
                    aria-label="Hide lyrics"
                    className="text-white hover:bg-white/15"
                  >
                    <Mic2 className="h-5 w-5" />
                  </Button>
                </div>
                <LyricsView variant="mobile" className="min-h-0 flex-1" />
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
                  <SeekBar variant="immersive" showTimes />
                  <div className="mt-3">
                    <PlayerControls variant="immersive" size="md" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 items-center justify-center py-4">
                  <div
                    className="relative aspect-square overflow-hidden rounded-2xl bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                    style={{ height: "min(100%,400px,46vh)" }}
                  >
                    {cover("400px", "object-cover")}
                  </div>
                </div>
                <div className="mt-auto shrink-0">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="min-w-0 pr-4">
                      <h1 className="truncate text-2xl font-bold text-white">
                        {currentTrack.title}
                      </h1>
                      <p className="truncate text-lg text-white/70">
                        {currentTrack.artist.name}
                      </p>
                    </div>
                    <LikeButton
                      trackId={currentTrack.id}
                      size="md"
                      tone="onDark"
                    />
                  </div>
                  <SeekBar
                    variant="immersive"
                    showTimes
                    remaining
                    className="mb-5"
                  />
                  <PlayerControls
                    variant="immersive"
                    size="lg"
                    className="mb-5 justify-between"
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLyrics(true)}
                      disabled={!hasLyrics}
                      aria-label="Show lyrics"
                      className="text-white hover:bg-white/15 disabled:opacity-30"
                    >
                      <Mic2 className="h-5 w-5" />
                    </Button>
                    <DownloadButton track={currentTrack} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Desktop ---------------- */}
          <div className="relative z-10 hidden h-full w-full flex-col lg:flex">
            <div className="flex h-[calc(100%-120px)] w-full flex-1 overflow-hidden">
              {showLyricsPane ? (
                <LyricsView variant="desktop" className="h-full" />
              ) : (
                <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center gap-16 px-12 text-white">
                  <div className="relative h-80 w-80 shrink-0 overflow-hidden rounded-2xl bg-black/30 shadow-2xl xl:h-96 xl:w-96">
                    {cover("400px", "object-cover")}
                  </div>
                  <div className="flex h-full flex-col justify-center gap-5">
                    <h1 className="text-5xl font-bold leading-tight xl:text-7xl">
                      {currentTrack.title}
                    </h1>
                    <h2 className="flex items-center gap-2 text-3xl text-white/80">
                      <Link
                        href={`/artists/${currentTrack.artist.id}`}
                        className="hover:underline"
                      >
                        {currentTrack.artist.name}
                      </Link>
                      {currentTrack.artist.verified && (
                        <BadgeCheck className="h-6 w-6 text-sky-400" />
                      )}
                    </h2>
                    {currentTrack.album && (
                      <p className="text-xl text-white/70">
                        {currentTrack.album.title}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[120px] border-t border-white/10 bg-black/25 backdrop-blur-md">
              <div className="mx-auto flex h-full max-w-7xl flex-col justify-center gap-3 px-8">
                <SeekBar variant="immersive" showTimes />
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {cover("56px", "object-cover")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {currentTrack.title}
                      </h3>
                      <p className="truncate text-sm text-white/70">
                        {currentTrack.artist.name}
                      </p>
                    </div>
                    <LikeButton
                      trackId={currentTrack.id}
                      tone="onDark"
                      className="ml-2"
                    />
                  </div>

                  <PlayerControls
                    variant="immersive"
                    size="md"
                    className="flex-1"
                  />

                  <div className="flex flex-1 items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowLyrics(!showLyrics)}
                      disabled={!hasLyrics}
                      aria-label="Toggle lyrics"
                      className={cn(
                        "text-white hover:bg-white/15 disabled:opacity-30",
                        showLyricsPane && "text-primary",
                      )}
                    >
                      <Mic2 className="h-5 w-5" />
                    </Button>
                    <DownloadButton track={currentTrack} />
                    <VolumeControl variant="immersive" className="ml-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
