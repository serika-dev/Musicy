"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Pause, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Album, useAlbum } from "@/hooks/useAlbums"
import { useMusicPlayer } from "@/contexts/music-player-context"

interface AlbumSpotlightProps {
  album?: Album
  albums?: Album[]
}

export function AlbumSpotlight({ album: initialAlbum, albums: initialAlbums }: AlbumSpotlightProps) {
  const spotlightAlbums = initialAlbums && initialAlbums.length > 0
    ? initialAlbums
    : initialAlbum
      ? [initialAlbum]
      : []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const activeInitialAlbum = spotlightAlbums[currentIndex] || spotlightAlbums[0]

  // Fetch full album to get tracks if not provided
  const { data: fullAlbum } = useAlbum(activeInitialAlbum?.id || "")
  const currentAlbum = fullAlbum || activeInitialAlbum

  const { playTrack, togglePlayPause, isPlaying, currentTrack } = useMusicPlayer()

  const tracks = currentAlbum?.tracks || []

  // Check if track playing is from this active album
  const isPlayingThisAlbum = Boolean(
    isPlaying &&
      currentTrack &&
      ((currentTrack.album?.id && currentTrack.album?.id === currentAlbum?.id) ||
        tracks.some((t) => t.id === currentTrack.id))
  )

  // Auto slide timer
  useEffect(() => {
    if (spotlightAlbums.length <= 1 || isHovered || isPlayingThisAlbum) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlightAlbums.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [spotlightAlbums.length, isHovered, isPlayingThisAlbum])

  if (!currentAlbum) return null

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPlayingThisAlbum) {
      togglePlayPause()
      return
    }

    if (tracks.length > 0) {
      playTrack(tracks[0], tracks, {
        type: "album",
        id: currentAlbum.id,
        name: currentAlbum.title,
      })
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % spotlightAlbums.length)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + spotlightAlbums.length) % spotlightAlbums.length)
  }

  const coverUrl = currentAlbum.coverImageUrl || "/placeholder-album.png"
  const [focalPosition, setFocalPosition] = useState<string>("object-[center_15%]")

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget
    if (!img.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight

    if (ratio < 0.85) {
      setFocalPosition("object-[center_15%]")
    } else if (ratio > 1.25) {
      setFocalPosition("object-center")
    } else {
      setFocalPosition("object-[center_12%]")
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-b-[2.5rem] sm:rounded-b-[3rem] rounded-t-none border-b border-white/10 bg-card shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] h-[400px] sm:h-[460px] lg:h-[520px] transition-all duration-500 flex flex-col justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient Artwork Background Blur */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-top filter blur-3xl opacity-35 scale-110 transition-all duration-1000"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />

      {/* Modern Gradient Overlay */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/80 to-background/30 md:bg-gradient-to-r md:from-background md:via-background/85 md:to-transparent"
        aria-hidden
      />

      {/* Main Content Layout - Fixed Container Height with Scaling Text */}
      <div className="relative z-10 h-full flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 p-6 sm:p-10 lg:p-14 overflow-hidden">
        
        {/* Left Copy Column */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-5 text-center md:text-left overflow-hidden">
          
          {/* Title & Artist */}
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground line-clamp-2 drop-shadow-md leading-tight min-w-0 break-words">
              {currentAlbum.title}
            </h1>
            
            <p className="text-base sm:text-xl font-bold text-muted-foreground truncate">
              <Link
                href={`/artists/${currentAlbum.artist.id}`}
                className="hover:text-primary transition-colors"
              >
                {currentAlbum.artist.name}
              </Link>
              {tracks.length > 0 && (
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground/70 ml-2">
                  • {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 pt-1 sm:pt-3 shrink-0">
            <Button
              size="lg"
              className="rounded-full px-7 sm:px-9 h-12 sm:h-14 text-sm sm:text-base font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/25 transition-transform active:scale-95 inline-flex items-center justify-center gap-2 shrink-0"
              onClick={handlePlay}
              disabled={tracks.length === 0}
            >
              {isPlayingThisAlbum ? (
                <>
                  <Pause className="w-5 h-5 fill-current shrink-0" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current shrink-0" />
                  <span>Listen now</span>
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6 sm:px-8 h-12 sm:h-14 text-sm sm:text-base font-bold bg-white/5 hover:bg-white/10 border-white/15 backdrop-blur-md text-foreground transition-transform active:scale-95 inline-flex items-center justify-center gap-2 shrink-0"
              asChild
            >
              <Link href={`/albums/${currentAlbum.id}`}>
                <Info className="w-5 h-5 shrink-0" />
                <span>View album</span>
              </Link>
            </Button>
          </div>

        </div>

        {/* Right Artwork Showcase */}
        <div className="flex-shrink-0 relative group">
          <div className="w-48 h-48 sm:w-60 sm:h-60 lg:w-76 lg:h-76 rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500 group-hover:scale-[1.03]">
            <img
              src={coverUrl}
              alt={currentAlbum.title}
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-all duration-500 ${focalPosition}`}
            />
          </div>
        </div>

      </div>

      {/* Minimal Carousel Controls (Only if multiple albums) */}
      {spotlightAlbums.length > 1 && (
        <div className="absolute bottom-5 right-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-full shadow-lg">
          <button
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
            aria-label="Previous album"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-white/80 px-1">
            {String(currentIndex + 1).padStart(2, "0")} / {String(spotlightAlbums.length).padStart(2, "0")}
          </span>

          <button
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
            aria-label="Next album"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
