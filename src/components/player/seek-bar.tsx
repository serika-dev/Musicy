"use client";

import { Slider } from "@/components/ui/slider";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { cn, formatDuration } from "@/lib/utils";

interface SeekBarProps {
  /** "bar" = primary tinted, "immersive" = white-on-dark. */
  variant?: "bar" | "immersive";
  /** Show elapsed / remaining time labels under the slider. */
  showTimes?: boolean;
  /** Show remaining time (-m:ss) instead of total duration on the right. */
  remaining?: boolean;
  /** Put the time labels either side of the rail (desktop dock). */
  inline?: boolean;
  className?: string;
}

export function SeekBar({
  variant = "bar",
  showTimes = false,
  remaining = false,
  inline = false,
  className,
}: SeekBarProps) {
  const { currentTime, duration, seekTo } = useMusicPlayer();
  const immersive = variant === "immersive";
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const onValueChange = (value: number[]) => {
    if (duration > 0) seekTo((value[0] / 100) * duration);
  };

  const elapsedLabel = formatDuration(Math.floor(currentTime));
  const endLabel = remaining
    ? `-${formatDuration(Math.max(0, Math.floor(duration - currentTime)))}`
    : formatDuration(Math.floor(duration));

  if (inline) {
    return (
      <div className={cn("flex w-full items-center gap-2", className)}>
        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {elapsedLabel}
        </span>
        <Slider
          value={[progress]}
          onValueChange={onValueChange}
          max={100}
          step={0.1}
          aria-label="Seek"
          className="cursor-pointer"
        />
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {endLabel}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Slider
        value={[progress]}
        onValueChange={onValueChange}
        max={100}
        step={0.1}
        aria-label="Seek"
        className="cursor-pointer"
        trackClassName={immersive ? "bg-white/25" : undefined}
        rangeClassName={immersive ? "bg-white" : undefined}
        thumbClassName={immersive ? "border-white bg-white" : undefined}
      />
      {showTimes && (
        <div
          className={cn(
            "mt-1.5 flex justify-between text-[11px] font-medium tabular-nums",
            immersive ? "text-white/60" : "text-muted-foreground",
          )}
        >
          <span>{elapsedLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
}
