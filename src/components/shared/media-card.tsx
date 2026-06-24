"use client"

import Link from "next/link"
import { Music2, Play } from "lucide-react"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MediaCardProps {
  href: string
  title: string
  subtitle?: string
  imageUrl?: string | null
  /** Render artwork as a circle (for artists). */
  rounded?: boolean
  /** Small uppercase label shown under the subtitle (e.g. "Album"). */
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
  imageUrl,
  rounded = false,
  badge,
  onPlay,
  fallback,
  className,
}: MediaCardProps) {
  return (
    <Link
      href={href}
      className={cn("group block focus:outline-none", className)}
    >
      <div className="space-y-3">
        <div
          className={cn(
            "relative aspect-square overflow-hidden bg-gradient-to-br from-muted via-muted/70 to-muted/50 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/30 group-focus-visible:ring-2 group-focus-visible:ring-ring",
            rounded ? "rounded-full" : "rounded-xl"
          )}
        >
          {imageUrl ? (
            // biome-ignore lint/performance/noImgElement: remote artwork from arbitrary hosts
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Button
                size="icon"
                className="h-11 w-11 rounded-full shadow-lg shadow-primary/30"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPlay(e)
                }}
                aria-label={`Play ${title}`}
              >
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </Button>
            </div>
          )}
        </div>

        <div className={cn("px-0.5", rounded && "text-center")}>
          <h3 className="truncate text-sm font-semibold leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 line-clamp-1 text-xs font-medium text-muted-foreground">
              {subtitle}
            </p>
          )}
          {badge && (
            <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {badge}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
