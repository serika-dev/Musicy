"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"
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
  const [focalPosition, setFocalPosition] = useState<string>("object-[center_15%]")

  const activeInitialAlbum = spotlightAlbums[currentIndex] || spotlightAlbums[0]

  // Fetch full album to get tracks if not provided
  const { data: fullAlbum } = useAlbum(activeInitialAlbum?.id || "")
  const currentAlbum = fullAlbum || activeInitialAlbum

  const { playTrack, togglePlayPause, isPlaying, currentTrack } = useMusicPlayer()

  const tracks = currentAlbum?.tracks || []

  // Compilations hold many performers; credit the top few instead of the one
  // album artist ("Various Artists"), which alone reads like a bug.
  const performerCounts = new Map<string, { name: string; count: number }>()
  for (const track of tracks) {
    if (!track.artist?.id) continue;
    const entry = performerCounts.get(track.artist.id);
    if (entry) entry.count += 1;
    else performerCounts.set(track.artist.id, { name: track.artist.name, count: 1 });
  }
  const performers = [...performerCounts.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count);
  const isMultiPerformer = performers.length > 1;
  const performerLine =
    performers
      .slice(0, 2)
      .map((p) => p.name)
      .join(", ") + (performers.length > 2 ? ` +${performers.length - 2} more` : "");

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

  const kind =
    currentAlbum.albumType === "SINGLE" ? "Single" : currentAlbum.albumType === "EP" ? "EP" : "Album"

  return (
    <div
      className="relative flex h-[23rem] flex-col overflow-hidden sm:h-[25rem] lg:h-[26rem]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Artwork wash — colour comes from the cover, chrome stays neutral */}
      <div
        key={coverUrl}
        className="absolute inset-0 z-0 scale-125 bg-cover bg-center opacity-60 blur-3xl animate-fade-in"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/60 to-background/10 lg:from-card lg:via-card/60 lg:to-card/10"
        aria-hidden
      />

      <div
        key={currentAlbum.id}
        className="relative z-10 flex h-full flex-col items-center justify-end gap-5 px-5 pb-12 pt-6 text-center animate-fade-in sm:flex-row sm:items-end sm:gap-7 sm:px-8 sm:pb-12 sm:text-left lg:px-8"
      >
        <Link
          href={`/albums/${currentAlbum.id}`}
          className="group relative shrink-0"
          aria-label={`Open ${currentAlbum.title}`}
        >
          <div className="shrink-0 h-36 w-36 overflow-hidden rounded-md shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.02] sm:h-48 sm:w-48 lg:h-56 lg:w-56">
            <img
              src={coverUrl}
              alt={currentAlbum.title}
              onLoad={handleImageLoad}
              className={`h-full w-full object-cover ${focalPosition}`}
            />
          </div>
        </Link>

        <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
          <div className="space-y-1 sm:space-y-2">
            <p className="text-xs font-semibold text-foreground/80 sm:text-sm">
              New release · {kind}
            </p>
            <h2 className="line-clamp-2 break-words text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {currentAlbum.title}
            </h2>
            <p className="truncate text-sm font-semibold text-foreground/90 sm:text-base">
              {isMultiPerformer ? (
                <span>{performerLine}</span>
              ) : (
                <Link
                  href={`/artists/${currentAlbum.artist.id}`}
                  className="hover:underline"
                >
                  {currentAlbum.artist.name}
                </Link>
              )}
              {tracks.length > 0 && (
                <span className="font-normal text-foreground/60">
                  {" "}· {tracks.length} {tracks.length === 1 ? "song" : "songs"}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <Button
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full shadow-xl shadow-black/40 hover:scale-105 hover:bg-primary sm:h-14 sm:w-14"
              onClick={handlePlay}
              disabled={tracks.length === 0}
              aria-label={isPlayingThisAlbum ? "Pause" : `Play ${currentAlbum.title}`}
            >
              {isPlayingThisAlbum ? (
                <Pause className="!size-6 fill-current" />
              ) : (
                <Play className="ml-0.5 !size-6 fill-current" />
              )}
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-full border-foreground/50 bg-transparent px-5 text-sm font-semibold hover:scale-105 hover:border-foreground hover:bg-transparent"
              asChild
            >
              <Link href={`/albums/${currentAlbum.id}`}>View album</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Pager */}
      {spotlightAlbums.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-3 sm:justify-end sm:px-8">
          <button
            type="button"
            onClick={handlePrev}
            className="hidden h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/70 sm:flex"
            aria-label="Previous album"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {spotlightAlbums.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(i)
                }}
                aria-label={`Show ${a.title}`}
                aria-current={i === currentIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-5 bg-foreground" : "w-1.5 bg-foreground/35 hover:bg-foreground/60"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="hidden h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/70 sm:flex"
            aria-label="Next album"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
