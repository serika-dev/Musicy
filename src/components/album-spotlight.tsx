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
    <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden rounded-3xl group shadow-2xl">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] group-hover:scale-110"
        style={{ backgroundImage: `url(${album.coverImageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent md:bg-gradient-to-r md:from-background md:via-background/40 md:to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-8 md:p-16 space-y-6">
        <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg">
              Featured {album.albumType}
            </span>
            {tracks.length > 0 && (
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                {tracks.length} tracks
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter max-w-3xl line-clamp-2 drop-shadow-2xl">
            {album.title}
          </h1>
          <p className="text-xl md:text-2xl font-bold text-white/80 drop-shadow-lg">
            {album.artist.name}
          </p>
        </div>

        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <Button 
            size="lg" 
            className="rounded-full px-10 h-14 text-lg font-black shadow-2xl active:scale-95 transition-all hover:scale-105 bg-primary hover:bg-primary/90" 
            onClick={handlePlay}
            disabled={tracks.length === 0}
          >
            <Play className="mr-3 h-6 w-6 fill-current" />
            Listen Now
          </Button>
          <Button size="lg" variant="secondary" className="rounded-full h-14 w-14 p-0 bg-white/10 hover:bg-white/20 backdrop-blur-xl border-white/10 text-white hover:scale-105 transition-all" asChild title="View Album">
            <Link href={`/albums/${album.id}`}>
              <Info className="h-7 w-7" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
