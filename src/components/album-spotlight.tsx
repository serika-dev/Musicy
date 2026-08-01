"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Info, Plus } from "lucide-react"
import { Album, useAlbum } from "@/hooks/useAlbums"
import { useMusicPlayer } from "@/contexts/music-player-context"

interface AlbumSpotlightProps {
  album: Album
}

export function AlbumSpotlight({ album: initialAlbum }: AlbumSpotlightProps) {
  const { playTrack } = useMusicPlayer()
  // Fetch full album to get tracks if they aren't provided
  const { data: fullAlbum } = useAlbum(initialAlbum.id)
  
  const album = fullAlbum || initialAlbum
  const tracks = album.tracks || []

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks, { type: 'album', id: album.id, name: album.title })
    }
  }

  return (
    <section className="hero group shadow-2xl">
      {/* Dynamic Background — keep at z-0 so scale transform never covers the darken layer */}
      <div
        className="z-0 bg-cover bg-center transition-transform duration-[2000ms] group-hover:scale-105"
        style={{ backgroundImage: `url(${album.coverImageUrl})` }}
      />
      {/* Darken overlay stays on hover; only lightens slightly */}
      <div
        className="z-[1] bg-gradient-to-t from-background via-background/70 to-transparent transition-opacity duration-500 group-hover:opacity-85 md:bg-gradient-to-r md:from-background md:via-background/50 md:to-transparent"
        aria-hidden
      />

      {/* Content */}
      <div className="hero-copy">
        <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg">
              Featured {album.albumType}
            </span>
            {tracks.length > 0 && (
              <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">
                {tracks.length} tracks
              </span>
            )}
          </div>
          <h1
            className="hero-title font-black tracking-tighter line-clamp-2 drop-shadow-2xl"
          >
            {album.title}
          </h1>
          <p
            className="text-xl md:text-2xl font-bold text-foreground/80 drop-shadow-lg truncate"
          >
            {album.artist.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <Button
            size="lg"
            className="rounded-full px-8 h-12 sm:h-14 sm:px-10 text-base sm:text-lg font-black shadow-2xl hover:scale-[1.03]"
            onClick={handlePlay}
            disabled={tracks.length === 0}
          >
            <Play className="mr-2 !h-5 !w-5 sm:!h-6 sm:!w-6 fill-current" />
            Listen now
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 bg-white/10 hover:bg-white/20 backdrop-blur-xl border-white/10 text-white hover:scale-105"
            asChild
          >
            <Link href={`/albums/${album.id}`} aria-label={`View ${album.title}`}>
              <Info className="!h-6 !w-6" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
