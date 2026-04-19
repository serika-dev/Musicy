"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Heart, Clock, Music2, Sparkles, Radio } from "lucide-react"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { useLikedSongs } from "@/hooks/useLikedSongs"

export function QuickAccess() {
  const { playTrack } = useMusicPlayer()
  const { data: likedSongsData } = useLikedSongs(50)

  const handlePlayLiked = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (likedSongsData?.tracks && likedSongsData.tracks.length > 0) {
      playTrack(likedSongsData.tracks[0], likedSongsData.tracks)
    }
  }

  const items = [
    { 
      name: "Liked Songs", 
      href: "/liked-songs", 
      icon: Heart, 
      color: "from-primary/80 to-primary",
      onPlay: handlePlayLiked
    },
    { 
      name: "Discovery Radio", 
      href: "/search", 
      icon: Radio, 
      color: "from-emerald-600 to-emerald-800" 
    },
    { 
      name: "Your Mixes", 
      href: "/playlists", 
      icon: Music2, 
      color: "from-blue-600 to-blue-800" 
    },
    { 
      name: "Artists", 
      href: "/artists", 
      icon: Music2, 
      color: "from-purple-600 to-purple-800" 
    },
    { 
      name: "Albums", 
      href: "/albums", 
      icon: Music2, 
      color: "from-amber-600 to-amber-800" 
    },
    { 
      name: "Fresh Releases", 
      href: "/albums", 
      icon: Sparkles, 
      color: "from-rose-600 to-rose-800" 
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <Link key={i} href={item.href} className="group relative overflow-hidden bg-card/40 hover:bg-card/60 transition-all rounded-md">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
              <item.icon className="w-7 h-7 text-white" />
            </div>
            <span className="font-bold text-sm md:text-base leading-none truncate pr-12">
              {item.name}
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={item.onPlay}
              className="absolute right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
            >
              <Play className="w-5 h-5 fill-current" />
            </Button>
          </div>
        </Link>
      ))}
    </div>
  )
}
