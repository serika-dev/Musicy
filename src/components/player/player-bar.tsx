"use client";

import { Maximize2, Music2, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { LikeButton } from "@/components/shared/like-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useArtworkColor } from "@/hooks/useArtworkColor";
import { DeviceSwitcher } from "./device-switcher";
import { NowPlaying } from "./now-playing";
import { PlayerControls } from "./player-controls";
import { QualityBadge } from "./quality-badge";
import { getTrackArtwork } from "./player-utils";
import { SeekBar } from "./seek-bar";
import { VolumeControl } from "./volume-control";

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    currentTime,
    duration,
  } = useMusicPlayer();
  const [fullscreen, setFullscreen] = useState(false);
  const artwork = getTrackArtwork(currentTrack);
  const tint = useArtworkColor(artwork);

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const cover = (sizes: string) =>
    artwork ? (
      <Image src={artwork} alt="" fill sizes={sizes} className="object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center bg-secondary">
        <Music2 className="h-4 w-4 text-muted-foreground" />
      </span>
    );

  return (
    <>
      {/* ---------------- Phones / tablets: mini player ----------------
          Floats above the tab bar, tinted with the artwork's colour and
          carrying a hairline progress rail — the Spotify iOS pattern. */}
      <div
        className="fixed inset-x-2 z-40 bottom-[calc(var(--mobile-nav-h)+var(--safe-bottom))] lg:hidden"
      >
        <div
          className="relative overflow-hidden rounded-lg shadow-xl shadow-black/40 transition-colors duration-700"
          style={{
            backgroundColor: tint
              ? `color-mix(in srgb, ${tint} 45%, #0b0b0d)`
              : "hsl(var(--secondary))",
          }}
        >
          <div className="flex h-14 items-center gap-2.5 pl-2 pr-1">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              aria-label="Open now playing"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/20">
                {cover("40px")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold leading-tight text-white">
                  {currentTrack.title}
                </span>
                <span className="mt-0.5 block truncate text-[12px] leading-tight text-white/70">
                  {currentTrack.artist.name}
                </span>
              </span>
            </button>
            <LikeButton trackId={currentTrack.id} tone="onDark" size="md" />
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="h-10 w-10 shrink-0 text-white hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="!size-6 fill-current" />
              ) : (
                <Play className="!size-6 fill-current" />
              )}
            </Button>
          </div>
          <div className="absolute inset-x-2 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------------- Desktop: docked player ---------------- */}
      <footer
        aria-label="Player"
        className="hidden h-[var(--player-dock-h)] shrink-0 items-center gap-4 bg-background px-4 lg:flex"
      >
        {/* Now playing */}
        <div className="flex w-[30%] min-w-[11rem] items-center gap-3.5">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Open full screen player"
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary shadow-lg shadow-black/40"
          >
            {cover("56px")}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-4 w-4 text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <Link
              href={`/tracks/${currentTrack.id}`}
              className="block truncate text-sm font-medium hover:underline"
            >
              {currentTrack.title}
            </Link>
            <Link
              href={`/artists/${currentTrack.artist.id}`}
              className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {currentTrack.artist.name}
            </Link>
          </div>
          <LikeButton trackId={currentTrack.id} className="shrink-0" />
        </div>

        {/* Transport */}
        <div className="flex max-w-[45rem] flex-1 flex-col items-center gap-1">
          <PlayerControls size="sm" />
          <SeekBar showTimes inline className="w-full" />
        </div>

        {/* Extras */}
        <div className="flex w-[30%] min-w-[11rem] items-center justify-end gap-1">
          <QualityBadge className="mr-1 hidden xl:flex" />
          <DeviceSwitcher />
          <DownloadButton
            track={currentTrack}
            className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:!size-4"
          />
          <VolumeControl className="ml-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setFullscreen(true)}
                aria-label="Full screen"
                className="text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Full screen</TooltipContent>
          </Tooltip>
        </div>
      </footer>

      <NowPlaying isOpen={fullscreen} onClose={() => setFullscreen(false)} />
    </>
  );
}
