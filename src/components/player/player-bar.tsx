"use client";

import { ChevronUp, Music2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { DeviceSwitcher } from "./device-switcher";
import { NowPlaying } from "./now-playing";
import { PlayerControls } from "./player-controls";
import { QualityBadge } from "./quality-badge";
import { getTrackArtwork } from "./player-utils";
import { SeekBar } from "./seek-bar";
import { VolumeControl } from "./volume-control";

export function PlayerBar() {
  const { currentTrack } = useMusicPlayer();
  const [fullscreen, setFullscreen] = useState(false);

  if (!currentTrack) return null;

  const artwork = getTrackArtwork(currentTrack);

  return (
    <>
      <div
        className={cn(
          // Float above the mobile bottom-nav on phones; pinned card on desktop.
          "fixed left-2 right-2 z-40 bottom-[calc(var(--mobile-nav-h)+var(--safe-bottom))]",
          "md:bottom-[var(--player-float-gap)] md:left-4 md:right-4",
          "surface rounded-2xl shadow-2xl",
        )}
      >
        <div className="px-3 pt-2 md:px-4">
          <SeekBar />
        </div>

        <div className="flex h-14 items-center gap-2 px-3 md:h-16 md:gap-3 md:px-4">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 md:max-w-xs">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Open full screen player"
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted transition-transform hover:scale-105 md:h-11 md:w-11"
            >
              {artwork ? (
                <Image
                  src={artwork}
                  alt={currentTrack.title}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
            </button>
            <div className="min-w-0">
              <Link
                href={`/tracks/${currentTrack.id}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {currentTrack.title}
              </Link>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/artists/${currentTrack.artist.id}`}
                  className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {currentTrack.artist.name}
                </Link>
                <QualityBadge className="hidden md:flex" />
              </div>
            </div>
            <LikeButton
              trackId={currentTrack.id}
              className="ml-auto hidden sm:flex"
            />
          </div>

          {/* Center controls */}
          <PlayerControls className="flex shrink-0 justify-center md:flex-1" />

          {/* Right cluster */}
          <div className="flex shrink-0 items-center justify-end gap-1 md:flex-1">
            <div className="hidden lg:block">
              <DeviceSwitcher />
            </div>
            <div className="hidden xl:flex">
              <VolumeControl />
            </div>
            <DownloadButton
              track={currentTrack}
              className="hidden text-muted-foreground hover:text-foreground sm:flex"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFullscreen(true)}
                  aria-label="Full screen"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full screen</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <NowPlaying isOpen={fullscreen} onClose={() => setFullscreen(false)} />
    </>
  );
}
