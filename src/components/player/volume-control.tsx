"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { cn } from "@/lib/utils";

interface VolumeControlProps {
  variant?: "bar" | "immersive";
  className?: string;
}

export function VolumeControl({
  variant = "bar",
  className,
}: VolumeControlProps) {
  const { volume, isMuted, setVolume, toggleMute } = useMusicPlayer();
  const immersive = variant === "immersive";
  const level = isMuted ? 0 : volume;

  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        className={
          immersive
            ? "text-white/80 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:text-foreground"
        }
      >
        <Icon className="h-4 w-4" />
      </Button>
      <Slider
        value={[level * 100]}
        onValueChange={(value) => setVolume(value[0] / 100)}
        max={100}
        step={1}
        aria-label="Volume"
        className="w-20 cursor-pointer"
        trackClassName={immersive ? "bg-white/25" : undefined}
        rangeClassName={immersive ? "bg-white" : undefined}
        thumbClassName={immersive ? "border-white bg-white" : undefined}
      />
    </div>
  );
}
