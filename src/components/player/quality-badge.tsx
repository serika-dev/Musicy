"use client";

import { AudioWaveform, Music } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

interface QualityBadgeProps {
  variant?: "bar" | "immersive";
  className?: string;
}

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  low: "Low",
  medium: "Medium",
  high: "High",
  lossless: "Lossless",
};

export function QualityBadge({ variant = "bar", className }: QualityBadgeProps) {
  const { settings } = useSettings();
  const quality = settings.audioQuality || "auto";
  const immersive = variant === "immersive";
  const isLossless = quality === "lossless";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        immersive
          ? "bg-white/15 text-white/90"
          : "bg-muted/80 text-muted-foreground",
        isLossless && (immersive ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-500/10 text-emerald-500"),
        className,
      )}
      title={`Streaming quality: ${QUALITY_LABELS[quality]}`}
    >
      {isLossless ? (
        <AudioWaveform className="h-3 w-3" />
      ) : (
        <Music className="h-3 w-3" />
      )}
      <span>{QUALITY_LABELS[quality]}</span>
    </div>
  );
}
