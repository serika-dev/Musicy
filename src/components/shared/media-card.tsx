"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Music2, Play } from "lucide-react"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MediaCardProps {
  href: string
  title: string
  subtitle?: string
  /** If provided, the subtitle becomes a link to this URL. */
  subtitleHref?: string
  imageUrl?: string | null
  /** Render artwork as a circle (for artists). */
  rounded?: boolean
  /** Kind label prefixed to the subtitle (e.g. "Album · Artist"). */
  badge?: string
  /** Called when the floating play button is pressed. Omit to hide it. */
  onPlay?: (e: React.MouseEvent) => void
  fallback?: React.ReactNode
  className?: string
}

export function MediaCard({
  href,
  title,
  subtitle,
  subtitleHref,
  imageUrl,
  rounded = false,
  badge,
  onPlay,
  fallback,
  className,
}: MediaCardProps) {
  const router = useRouter()

  return (
    <Link
      href={href}
      className={cn(
        // Spotify-style tile: the whole card lifts onto a panel on hover.
        "group block rounded-lg p-2 -m-2 transition-colors duration-200 hover:bg-panel-hover focus:outline-none focus-visible:bg-panel-hover md:p-3 md:-m-3",
        className,
      )}
    >
      <div className="space-y-2.5">
        <div
          className={cn(
            "relative aspect-square overflow-hidden bg-secondary shadow-lg shadow-black/30",
            rounded ? "rounded-full" : "rounded-md"
          )}
        >
          {imageUrl ? (
            // biome-ignore lint/performance/noImgElement: remote artwork from arbitrary hosts
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            (fallback ?? (
              <div className="flex h-full w-full items-center justify-center">
                <Music2 className="h-10 w-10 text-muted-foreground/40" />
              </div>
            ))
          )}

          {onPlay && (
            <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-md:hidden">
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-xl shadow-black/50 hover:scale-105 hover:bg-primary"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPlay(e)
                }}
                aria-label={`Play ${title}`}
              >
                <Play className="ml-0.5 !size-5 fill-current" />
              </Button>
            </div>
          )}
        </div>

        <div className={cn("min-w-0", rounded && "text-center")}>
          <h3 className="truncate text-sm font-medium leading-snug">
            {title}
          </h3>
          {(subtitle || badge) && (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
              {badge && (
                <span>
                  {badge}
                  {subtitle && " · "}
                </span>
              )}
              {subtitle &&
                (subtitleHref ? (
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(subtitleHref)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        router.push(subtitleHref)
                      }
                    }}
                    className="cursor-pointer hover:text-foreground hover:underline"
                  >
                    {subtitle}
                  </span>
                ) : (
                  subtitle
                ))}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
