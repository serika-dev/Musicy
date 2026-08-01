import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Type scale for the lockup. */
  size?: "sm" | "md" | "lg";
  /**
   * @deprecated Icon mark is no longer rendered. Kept so call sites type-check.
   */
  showWordmark?: boolean;
  /**
   * @deprecated Icon mark is no longer rendered. Kept so call sites type-check.
   */
  variant?: "soft" | "gradient" | "glass";
  /**
   * @deprecated Icon mark is no longer rendered. Kept so call sites type-check.
   */
  idSuffix?: string;
  /** Show “by serika.dev” under the wordmark (default true). */
  showSubtext?: boolean;
  /** Stack wordmark + subtext (default) or place them side-by-side. */
  layout?: "stack" | "inline";
}

const sizeMap = {
  sm: {
    title: "text-lg leading-none",
    sub: "text-[10px] leading-tight",
    gap: "gap-0.5",
  },
  md: {
    title: "text-xl leading-none",
    sub: "text-xs leading-tight",
    gap: "gap-0.5",
  },
  lg: {
    title: "text-4xl leading-none",
    sub: "text-sm leading-tight",
    gap: "gap-1",
  },
} as const;

/**
 * Musicy wordmark lockup — text only:
 *   Musicy
 *   by serika.dev
 */
export function Logo({
  className,
  size = "md",
  showSubtext = true,
  layout = "stack",
}: LogoProps) {
  const s = sizeMap[size];

  return (
    <span
      className={cn(
        "inline-flex min-w-0",
        layout === "stack"
          ? cn("flex-col items-start", s.gap)
          : "items-baseline gap-2",
        className,
      )}
    >
      <span
        className={cn(
          "font-sans font-bold tracking-tight text-primary",
          s.title,
        )}
      >
        Musicy
      </span>
      {showSubtext && (
        <span
          className={cn(
            "font-sans font-medium text-muted-foreground",
            s.sub,
          )}
        >
          by serika.dev
        </span>
      )}
    </span>
  );
}

/**
 * @deprecated Prefer {@link Logo}. Kept as a no-op text fallback for any
 * residual imports that still expect a mark component.
 */
export function LogoMark({ className }: { className?: string; idSuffix?: string }) {
  return (
    <span
      className={cn("font-sans font-bold tracking-tight text-primary text-sm", className)}
      role="img"
      aria-label="Musicy"
    >
      M
    </span>
  );
}
