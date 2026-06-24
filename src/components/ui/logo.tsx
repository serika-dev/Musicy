import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** Unique-ish suffix so multiple gradients on one page don't collide. */
  idSuffix?: string;
}

/**
 * Musicy brand mark — a stylised music note rendered as an inline SVG so it
 * stays crisp at any size and can be wrapped in glass / gradient containers.
 */
export function LogoMark({ className, idSuffix = "default" }: LogoMarkProps) {
  const gradId = `musicy-logo-grad-${idSuffix}`;
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Musicy"
    >
      <path
        d="M256 120V320M256 320C256 353.137 229.137 380 196 380C162.863 380 136 353.137 136 320C136 286.863 162.863 260 196 260C215.86 260 233.435 269.619 244.314 284.417"
        stroke={`url(#${gradId})`}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M256 160C256 140 270 120 300 120C330 120 350 140 350 170C350 200 330 220 300 220"
        stroke={`url(#${gradId})`}
        strokeWidth="40"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="136"
          y1="120"
          x2="350"
          y2="380"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Size of the mark container. */
  size?: "sm" | "md" | "lg";
  /** Render the "Musicy" wordmark next to the mark. */
  showWordmark?: boolean;
  /** Visual treatment of the mark container. */
  variant?: "soft" | "gradient" | "glass";
  idSuffix?: string;
}

const sizeMap = {
  sm: { box: "h-8 w-8 rounded-lg", mark: "h-5 w-5", text: "text-lg" },
  md: { box: "h-10 w-10 rounded-xl", mark: "h-6 w-6", text: "text-xl" },
  lg: { box: "h-16 w-16 rounded-2xl", mark: "h-10 w-10", text: "text-3xl" },
} as const;

/**
 * App logo lockup. Used across the shell (header / sidebar). Pass
 * `variant="glass"` + `size="lg"` for the auth screens' alternate treatment.
 */
export function Logo({
  className,
  size = "md",
  showWordmark = true,
  variant = "soft",
  idSuffix = "default",
}: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden",
          s.box,
          variant === "soft" && "bg-primary/10",
          variant === "gradient" &&
            "bg-gradient-to-br from-primary/25 to-cyan-400/20 shadow-lg shadow-primary/20",
          variant === "glass" && "liquid-glass",
        )}
      >
        <LogoMark className={s.mark} idSuffix={idSuffix} />
      </span>
      {showWordmark && (
        <span className={cn("font-black tracking-tight text-gradient", s.text)}>
          Musicy
        </span>
      )}
    </span>
  );
}
