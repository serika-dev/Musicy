"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  /** "bar" = bottom bar (primary tinted), "immersive" = fullscreen (white). */
  variant?: "bar" | "immersive";
  size?: "sm" | "md" | "lg";
  /** Show shuffle/repeat at every width (they hide on phones by default). */
  showToggles?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { play: "h-8 w-8", icon: "h-4 w-4", skip: "h-4 w-4", side: "h-4 w-4" },
  md: { play: "h-11 w-11", icon: "h-5 w-5", skip: "h-5 w-5", side: "h-5 w-5" },
  lg: { play: "h-16 w-16", icon: "h-7 w-7", skip: "h-8 w-8", side: "h-6 w-6" },
};

export function PlayerControls({
  variant = "bar",
  size = "sm",
  showToggles = false,
  className,
}: PlayerControlsProps) {
  const {
    isPlaying,
    togglePlayPause,
    nextTrack,
    previousTrack,
    toggleRepeat,
    toggleShuffle,
    isRepeat,
    isShuffle,
    repeatMode,
  } = useMusicPlayer();

  const s = sizeMap[size];
  const immersive = variant === "immersive";

  const ghost = immersive
    ? "text-white/80 hover:text-white hover:bg-white/10"
    : "text-muted-foreground hover:bg-transparent hover:text-foreground";
  const active = immersive ? "text-white" : "text-primary hover:text-primary";
  // Toggles get a dot under the glyph when on, so state never relies on
  // colour alone.
  const dot = (
    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
  );

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 sm:gap-3",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={cn("relative", showToggles ? "flex" : "hidden sm:flex", ghost, isShuffle && active)}
            aria-label="Shuffle"
            aria-pressed={isShuffle}
          >
            <Shuffle className={s.side} />
            {isShuffle && dot}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Shuffle</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="icon"
        onClick={previousTrack}
        className={ghost}
        aria-label="Previous track"
      >
        <SkipBack className={cn(s.skip, "fill-current")} />
      </Button>

      <Button
        size="icon"
        onClick={togglePlayPause}
        className={cn(
          "rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          s.play,
          immersive
            ? "bg-white text-black hover:bg-white"
            : "bg-foreground text-background hover:bg-foreground",
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className={cn(s.icon, "fill-current")} />
        ) : (
          <Play className={cn(s.icon, "ml-0.5 fill-current")} />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={nextTrack}
        className={ghost}
        aria-label="Next track"
      >
        <SkipForward className={cn(s.skip, "fill-current")} />
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={cn("relative", showToggles ? "flex" : "hidden sm:flex", ghost, isRepeat && active)}
            aria-label="Repeat"
            aria-pressed={isRepeat}
          >
            {repeatMode === "track" ? (
              <Repeat1 className={s.side} />
            ) : (
              <Repeat className={s.side} />
            )}
            {isRepeat && dot}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {repeatMode === "track" ? "Repeat track" : "Repeat"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
