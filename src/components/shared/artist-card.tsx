import Link from "next/link"

import { ArtistImage } from "@/components/artist-image"
import { cn } from "@/lib/utils"

interface ArtistCardProps {
  id: string
  name: string
  imageUrl?: string | null
  /** Line under the name; defaults to "Artist". */
  subtitle?: string
  className?: string
}

/** Circular artist tile that matches MediaCard's hover panel. */
export function ArtistCard({ id, name, imageUrl, subtitle = "Artist", className }: ArtistCardProps) {
  return (
    <Link
      href={`/artists/${id}`}
      className={cn(
        "group block rounded-lg p-2 -m-2 transition-colors duration-200 hover:bg-panel-hover focus:outline-none focus-visible:bg-panel-hover md:p-3 md:-m-3",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-full bg-secondary shadow-lg shadow-black/30">
        <ArtistImage
          artistId={id}
          artistImageUrl={imageUrl ?? undefined}
          artistName={name}
          className="h-full w-full object-cover"
          fallbackClassName="flex h-full w-full items-center justify-center bg-secondary"
        />
      </div>
      <p className="mt-2.5 truncate text-sm font-medium leading-snug">{name}</p>
      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
    </Link>
  )
}
