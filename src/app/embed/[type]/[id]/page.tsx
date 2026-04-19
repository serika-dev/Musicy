"use client"

import { useEffect, useState } from "react"
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
  // This is a simplified version of the main player for iframes
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  
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

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">Loading...</div>
  if (!data) return <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">Not Found</div>

  const title = (data as any).title || (data as any).name
  const subtitle = (data as any).artist?.name || (data as any).owner?.username || "Musicy"
  const coverImage = (data as any).coverImageUrl || (data as any).imageUrl || (data as any).album?.coverImageUrl

  return (
    <div className="flex items-center h-screen bg-neutral-900 text-white p-4 overflow-hidden select-none">
      <div className="relative w-[120px] h-[120px] shrink-0 rounded-lg overflow-hidden shadow-2xl mr-4">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
            <Music className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
           <Button 
             variant="ghost" 
             size="icon" 
             className="w-12 h-12 rounded-full bg-primary text-white hover:scale-105 transition-transform"
             onClick={() => setIsPlaying(!isPlaying)}
            >
             {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
           </Button>
        </div>
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="text-sm font-black uppercase tracking-widest text-primary/60 mb-1">Musicy</div>
        <h2 className="text-xl font-bold truncate pr-8">{title}</h2>
        <p className="text-white/60 text-sm truncate font-medium mb-3">{subtitle}</p>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-1 bg-white/10" />
          <div className="flex justify-between text-[10px] font-bold text-white/40 font-mono">
             <span>0:00</span>
             <span>3:45</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center gap-4">
         <a 
           href={`/${type}/${id}`} 
           target="_blank" 
           rel="noopener noreferrer"
           className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
         >
           <ExternalLink className="w-4 h-4 text-white/60" />
         </a>
      </div>
    </div>
  )
}
