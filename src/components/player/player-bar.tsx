"use client";

import { ChevronUp, Heart, Music2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMusicPlayer } from "@/contexts/music-player-context";
import {
  useIsTrackLiked,
  useLikeTrack,
  useUnlikeTrack,
} from "@/hooks/useLikedSongs";
import { cn } from "@/lib/utils";
import { DeviceSwitcher } from "./device-switcher";
import { NowPlaying } from "./now-playing";
import { PlayerControls } from "./player-controls";
import { getTrackArtwork } from "./player-utils";
import { SeekBar } from "./seek-bar";
import { VolumeControl } from "./volume-control";

export function PlayerBar() {
  const { currentTrack } = useMusicPlayer();
  const [fullscreen, setFullscreen] = useState(false);

  const { data: isLiked } = useIsTrackLiked(currentTrack?.id || "");
  const { mutate: likeTrack } = useLikeTrack();
  const { mutate: unlikeTrack } = useUnlikeTrack();
  const [localLike, setLocalLike] = useState(false);
  useEffect(() => {
    if (isLiked !== undefined) setLocalLike(isLiked);
  }, [isLiked]);

  if (!currentTrack) return null;

  const artwork = getTrackArtwork(currentTrack);

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !localLike;
    setLocalLike(next);
    if (next) likeTrack(currentTrack.id);
    else unlikeTrack(currentTrack.id);
  };

  return (
    <>
      <div
        className={cn(
          // Float above the mobile bottom-nav on phones; pinned card on desktop.
          "fixed left-2 right-2 z-40 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]",
          "md:bottom-4 md:left-4 md:right-4",
          "surface rounded-2xl shadow-2xl",
        )}
      >
        <div className="px-3 pt-2 md:px-4">
          <SeekBar />
        </div>

        <div className="flex h-16 items-center gap-3 px-3 md:px-4">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:max-w-xs">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Open full screen player"
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted transition-transform hover:scale-105"
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
              <p className="truncate text-sm font-medium">
                {currentTrack.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack.artist.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLikeToggle}
              aria-label="Like"
              className={cn(
                "ml-auto hidden shrink-0 sm:flex",
                localLike
                  ? "text-primary hover:text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", localLike && "fill-current")} />
            </Button>
          </div>

          {/* Center controls */}
          <PlayerControls className="flex-1" />

          {/* Right cluster */}
          <div className="flex flex-1 items-center justify-end gap-1">
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
