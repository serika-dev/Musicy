"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import type { Track } from "@/types/track"
import { AddToPlaylistButton } from "@/components/add-to-playlist-button"
import { ShareMenu } from "@/components/share-menu"
import { MoreVertical, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrackListItemProps {
  track: Track
  isPlaying?: boolean
  isCurrentTrack?: boolean
  onPlay: () => void
  showAlbum?: boolean
  showAddButton?: boolean
  className?: string
}

export function TrackListItem({ 
  track, 
  isPlaying = false, 
  isCurrentTrack = false,
  onPlay,
  showAlbum = true,
  showAddButton = false,
  className
}: TrackListItemProps) {
  return (
    <div 
      className={cn(
        "w-full flex items-center space-x-2 sm:space-x-4 p-2 sm:p-3 rounded-md hover:bg-muted/50 group cursor-pointer transition-colors",
        isCurrentTrack ? 'bg-primary/10' : '',
        className
      )}
      onClick={(e) => {
        // Only trigger play if clicking on the main area, not on buttons or links
        if (!(e.target as Element).closest('button, a')) {
          onPlay()
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !(e.target as Element).closest('button, a')) {
          e.preventDefault()
          onPlay()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play ${track.title} by ${track.artist.name}`}
    >
      {/* Album Cover / Icon */}
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden relative">
        {track.album?.coverImageUrl ? (
          <Image
            src={track.album.coverImageUrl} 
            alt={track.album?.title || 'Album cover'}
            fill
            className="object-cover rounded-md"
            sizes="(max-width: 640px) 40px, 48px"
            onError={() => {
              // Handle error with fallback in parent div
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 rounded-md flex items-center justify-center">
            <div className="text-lg sm:text-2xl">🎵</div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <Link 
          href={`/tracks/${track.id}`}
          className={`font-medium truncate block hover:underline ${isCurrentTrack ? 'text-primary' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {track.title}
        </Link>
        <div className="text-sm text-muted-foreground truncate">
          <Link 
            href={`/artists/${track.artist.id}`}
            className="hover:text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {track.artist.name}
            {track.artist.verified && " ✓"}
          </Link>
          {showAlbum && track.album && track.album.id && (
            <>
              <span> • </span>
              <Link 
                href={`/albums/${track.album.id}`}
                className="hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {track.album.title}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Track Details */}
      <div className="hidden lg:flex items-center space-x-4 text-sm text-muted-foreground">
        {track.genre && (
          <span className="hidden xl:block">{track.genre}</span>
        )}
        <span className="hidden lg:block">{track.format}</span>
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Add to Playlist Button */}
        <div 
          className={`transition-opacity ${
            showAddButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <AddToPlaylistButton trackId={track.id} />
        </div>

        <span className="text-xs sm:text-sm text-muted-foreground">
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
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          }
        />
        
        <Button 
          size="sm" 
          variant="ghost" 
          className={`h-8 w-8 sm:h-9 sm:w-9 p-0 transition-opacity ${
            isCurrentTrack || isPlaying 
              ? 'opacity-100' 
              : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
        >
          {isCurrentTrack && isPlaying ? (
            <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <Play className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
