"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import type { Track } from "@/types/track"
import { AddToPlaylistButton } from "@/components/add-to-playlist-button"
import { LikeButton } from "@/components/shared/like-button"
import { ShareMenu } from "@/components/share-menu"
import { MoreHorizontal, Users, Music } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TrackListItemProps {
  track: Track
  isPlaying?: boolean
  isCurrentTrack?: boolean
  onPlay: () => void
  showAlbum?: boolean
  showAddButton?: boolean
  /** 0-based position. When set, a number column leads the row. */
  index?: number
  /** Hide the artwork thumbnail (album pages, where every row shares it). */
  showArtwork?: boolean
  className?: string
}

export function TrackListItem({ 
  track, 
  isPlaying = false, 
  isCurrentTrack = false,
  onPlay,
  showAlbum = true,
  showAddButton = false,
  index,
  showArtwork = true,
  className
}: TrackListItemProps) {
  const active = isCurrentTrack
  const { togglePlayPause } = useMusicPlayer()
  // Clicking the current track pauses/resumes rather than restarting it.
  const handlePlay = () => (active ? togglePlayPause() : onPlay())
  const eq = (
    <span className="eq-bars text-primary" data-paused={!isPlaying} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )

  return (
    <div 
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07] sm:gap-4 sm:px-3",
        active && "bg-foreground/[0.05]",
        className
      )}
      onClick={(e) => {
        // Only trigger play if clicking on the main area, not on buttons or
        // links. The row is itself role="button", so ignore that match.
        const hit = (e.target as HTMLElement).closest('button, a, [role="button"], [role="link"]')
        if (!hit || hit === e.currentTarget) {
          handlePlay()
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !(e.target as Element).closest('button, a')) {
          e.preventDefault()
          handlePlay()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play ${track.title} by ${track.artist.name}`}
    >
      {index !== undefined && (
        <div className="hidden w-6 shrink-0 items-center justify-center text-[15px] tabular-nums text-muted-foreground sm:flex">
          {active ? (
            <>
              <span className="group-hover:hidden">{eq}</span>
              {isPlaying ? (
                <Pause className="hidden h-4 w-4 fill-current text-foreground group-hover:block" />
              ) : (
                <Play className="hidden h-4 w-4 fill-current text-foreground group-hover:block" />
              )}
            </>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="hidden h-4 w-4 fill-current text-foreground group-hover:block" />
            </>
          )}
        </div>
      )}

      {/* Album Cover / Artist Image */}
      {showArtwork && (
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary sm:h-11 sm:w-11">
        {(() => {
          // Explicitly prioritize track-specific artwork
          const isCompilation = (track.album as any)?.albumType === 'COMPILATION' || (track.album as any)?.type === 'COMPILATION'
          
          const imgUrl = track.coverImageUrl || (isCompilation 
            ? ((track.artist as any)?.imageUrl || track.album?.coverImageUrl)
            : (track.album?.coverImageUrl || (track.artist as any)?.imageUrl))

          if (imgUrl) return (
            <Image
              src={imgUrl}
              alt={track.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, 44px"
            />
          )
          
          return (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Music className="h-5 w-5 text-muted-foreground/60" />
            </div>
          )
        })()}
        {/* Unnumbered rows show play state on the artwork instead */}
        {index === undefined && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {active && isPlaying ? (
              <>
                <span className="group-hover:hidden">{eq}</span>
                <Pause className="hidden h-4 w-4 fill-white text-white group-hover:block" />
              </>
            ) : (
              <Play className="h-4 w-4 fill-white text-white" />
            )}
          </div>
        )}
      </div>
      )}

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        {/* Link hugs the title so the rest of the row stays click-to-play */}
        <div className="flex min-w-0">
          <Link 
            href={`/tracks/${track.id}`}
            className={cn("truncate text-[15px] leading-snug hover:underline", active ? "text-primary" : "text-foreground")}
            onClick={(e) => e.stopPropagation()}
          >
            {track.title}
          </Link>
        </div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
          {track.artist.name === "Various Artists" ? (
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="hover:text-foreground hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {track.artist.name}
                  <Users className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-3">
                  <h4 className="font-bold text-sm border-b pb-2">Featured Artists</h4>
                  <div className="grid gap-2">
                    {(track.featuredArtists || track.album?.featuredArtists || []).map((art) => (
                      <Link
                        key={art.id}
                        href={`/artists/${art.id}`}
                        className="flex items-center gap-2 hover:bg-muted p-1 rounded-md transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted relative shrink-0">
                          {art.imageUrl ? (
                            <Image src={art.imageUrl} alt={art.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-[10px]">
                              {art.name[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium truncate">{art.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Link 
              href={`/artists/${track.artist.id}`}
              className="hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist.name}
            </Link>
          )}
          {showAlbum && track.album && track.album.id && (
            <>
              <span aria-hidden="true">·</span>
              <Link 
                href={`/albums/${track.album.id}`}
                className="hover:text-foreground hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {track.album.title}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Track Details */}
      <div className="hidden items-center gap-4 text-[13px] text-muted-foreground lg:flex">
        {track.genre && (
          <span className="hidden max-w-[10rem] truncate xl:block">{track.genre}</span>
        )}
        {track.format && (
          <span className="rounded border border-border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide">
            {track.format}
          </span>
        )}
      </div>

      {/* Duration & Actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div
          className={cn(
            "transition-opacity",
            showAddButton ? "opacity-100" : "hidden opacity-0 group-hover:opacity-100 sm:block"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <LikeButton trackId={track.id} />
        </div>
        <div
          className={cn(
            "transition-opacity",
            showAddButton ? "hidden sm:block sm:opacity-0 sm:group-hover:opacity-100" : "hidden opacity-0 group-hover:opacity-100 sm:block"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <AddToPlaylistButton trackId={track.id} />
        </div>

        <span className="hidden w-11 text-right text-[13px] tabular-nums text-muted-foreground sm:block">
          {formatDuration(track.duration)}
        </span>

        <ShareMenu
          title={track.title}
          url={`/tracks/${track.id}`}
          id={track.id}
          type="track"
          trigger={
            <Button
              size="sm"
              variant="ghost"
              aria-label={`More options for ${track.title}`}
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  )
}
