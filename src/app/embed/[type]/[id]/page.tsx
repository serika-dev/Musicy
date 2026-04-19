"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { useArtist } from "@/hooks/useArtists"
import { useAlbum, useTrack } from "@/hooks/useAlbums"
import { usePlaylist } from "@/hooks/usePlaylist"
import { Play, Pause, Music, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatDuration } from "@/lib/utils"

export default function EmbedPage() {
  const params = useParams()
  const rawType = params.type as string
  const id = params.id as string
  const type = rawType.endsWith('s') ? rawType : `${rawType}s`

  // We need to fetch data based on type
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  // Logic to handle different entity types
  const trackQuery = useTrack(type === 'tracks' ? id : '')
  const playlistQuery = usePlaylist(type === 'playlists' ? id : '')
  const artistQuery = useArtist(type === 'artists' ? id : '')
  const albumQuery = useAlbum(type === 'albums' ? id : '')

  const data = type === 'tracks' ? trackQuery.data : 
               type === 'playlists' ? playlistQuery.data :
               type === 'artists' ? artistQuery.data :
               type === 'albums' ? albumQuery.data : null

  const isLoading = trackQuery.isLoading || playlistQuery.isLoading || artistQuery.isLoading || albumQuery.isLoading

  // Get the effective track to play
  const trackToPlay = type === 'tracks' ? data : 
                    (data as any).tracks?.[0]?.track || (data as any).tracks?.[0] || null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch(console.error)
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">Loading...</div>
  if (!data) return <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">Not Found</div>

  const title = (data as any).title || (data as any).name
  const subtitle = (data as any).artist?.name || (data as any).owner?.username || "Musicy"
  const coverImage = (data as any).coverImageUrl || (data as any).imageUrl || (data as any).album?.coverImageUrl

  return (
    <div className="flex items-center h-screen bg-neutral-900 text-white p-4 overflow-hidden select-none">
      <audio 
        ref={audioRef} 
        src={trackToPlay?.filePath ? `${trackToPlay.filePath}?t=${Date.now()}` : undefined} 
      />
      
      <div className="relative w-[120px] h-[120px] shrink-0 rounded-lg overflow-hidden shadow-2xl mr-4 group">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
            <Music className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
           <Button 
             variant="ghost" 
             size="icon" 
             className="w-12 h-12 rounded-full bg-primary text-white hover:scale-105 transition-transform shadow-xl"
             onClick={() => setIsPlaying(!isPlaying)}
            >
             {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
           </Button>
        </div>
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Musicy</div>
        <h2 className="text-lg font-black truncate pr-4 leading-tight mb-0.5">{title}</h2>
        <p className="text-white/50 text-xs truncate font-bold mb-4">{subtitle}</p>
        
        <div className="space-y-2">
          <div className="relative">
            <Progress value={progress} className="h-1 bg-white/10" />
            <input 
              type="range"
              min="0"
              max="100"
              value={progress || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setProgress(val)
                if (audioRef.current && audioRef.current.duration) {
                  audioRef.current.currentTime = (val / 100) * audioRef.current.duration
                }
              }}
              className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] font-black text-white/30 font-mono tracking-tighter">
             <span>{formatDuration(currentTime * 1000)}</span>
             <span>{formatDuration(duration * 1000)}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center">
         <a 
           href={`/${type}/${id}`} 
           target="_blank" 
           rel="noopener noreferrer"
           className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all group/link"
           title="Open in Musicy"
         >
           <ExternalLink className="w-4 h-4 text-white/40 group-hover/link:text-white transition-colors" />
         </a>
      </div>
    </div>
  )
}
