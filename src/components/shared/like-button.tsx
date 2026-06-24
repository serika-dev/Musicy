"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useIsTrackLiked,
  useLikeTrack,
  useUnlikeTrack,
} from "@/hooks/useLikedSongs";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  trackId: string;
  size?: "sm" | "md" | "lg";
  /** Color treatment — "onDark" for white-on-artwork overlays. */
  tone?: "default" | "onDark";
  className?: string;
  /** Stop click from bubbling (e.g. inside a clickable track row). */
  stopPropagation?: boolean;
}

const sizeMap = {
  sm: { btn: "icon-sm" as const, icon: "h-4 w-4" },
  md: { btn: "icon" as const, icon: "h-5 w-5" },
  lg: { btn: "icon-lg" as const, icon: "h-7 w-7" },
};

const SPARKS = [
  { x: "-14px", y: "-12px" },
  { x: "14px", y: "-12px" },
  { x: "-16px", y: "6px" },
  { x: "16px", y: "6px" },
  { x: "0px", y: "-18px" },
];

/**
 * Self-contained like toggle with a kawaii heart-pop + sparkle burst.
 * Optimistically flips local state and fires the like/unlike mutation.
 */
export function LikeButton({
  trackId,
  size = "sm",
  tone = "default",
  className,
  stopPropagation = true,
}: LikeButtonProps) {
  const { data: isLiked } = useIsTrackLiked(trackId);
  const { mutate: likeTrack } = useLikeTrack();
  const { mutate: unlikeTrack } = useUnlikeTrack();
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (isLiked !== undefined) setLiked(isLiked);
  }, [isLiked]);

  const s = sizeMap[size];

  const handleToggle = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    const next = !liked;
    setLiked(next);
    if (next) {
      setBurst((b) => b + 1);
      likeTrack(trackId);
    } else {
      unlikeTrack(trackId);
    }
  };

  return (
    <Button
      variant="ghost"
      size={s.btn}
      onClick={handleToggle}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "relative shrink-0 overflow-visible",
        tone === "default"
          ? liked
            ? "text-primary hover:text-primary"
            : "text-muted-foreground hover:text-foreground"
          : liked
            ? "text-rose-400 hover:bg-white/15"
            : "text-white hover:bg-white/15",
        className,
      )}
    >
      <span className="relative inline-flex items-center justify-center">
        <Heart
          key={burst}
          className={cn(
            s.icon,
            "transition-colors",
            liked && "fill-current",
            burst > 0 && liked && "animate-heart-pop",
          )}
        />
        {burst > 0 && liked && (
          <>
            <span
              key={`ring-${burst}`}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-full",
                "animate-heart-burst",
                tone === "default" ? "bg-primary/30" : "bg-rose-400/30",
              )}
            />
            {SPARKS.map((sp) => (
              <span
                key={`spark-${burst}-${sp.x}-${sp.y}`}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full animate-sparkle",
                  tone === "default" ? "bg-primary" : "bg-rose-300",
                )}
                style={
                  {
                    "--spark-x": sp.x,
                    "--spark-y": sp.y,
                  } as React.CSSProperties
                }
              />
            ))}
          </>
        )}
      </span>
    </Button>
  );
}
