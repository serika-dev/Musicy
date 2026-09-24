"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Heart, Sparkles, Mic2, Disc3, Compass, ListMusic } from "lucide-react"
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
      color: "from-indigo-600 via-violet-500 to-fuchsia-300",
      onPlay: handlePlayLiked
    },
    { 
      name: "New Releases", 
      href: "/tracks", 
      icon: Sparkles, 
      color: "from-emerald-600 to-emerald-800" 
    },
    { 
      name: "Your Playlists", 
      href: "/playlists", 
      icon: ListMusic, 
      color: "from-blue-600 to-blue-800" 
    },
    { 
      name: "Artists", 
      href: "/artists", 
      icon: Mic2, 
      color: "from-purple-600 to-purple-800" 
    },
    { 
      name: "Albums", 
      href: "/albums", 
      icon: Disc3, 
      color: "from-amber-600 to-amber-800" 
    },
    { 
      name: "Browse", 
      href: "/search", 
      icon: Compass, 
      color: "from-rose-600 to-rose-800" 
    },
  ]


  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group relative flex h-14 items-center overflow-hidden rounded-md bg-foreground/[0.07] transition-colors hover:bg-foreground/[0.14] md:h-16"
        >
          <div
            className={`flex h-full aspect-square shrink-0 items-center justify-center bg-gradient-to-br ${item.color} shadow-[4px_0_12px_rgba(0,0,0,0.25)]`}
          >
            <item.icon className="h-5 w-5 text-white md:h-6 md:w-6" />
          </div>
          <span className="min-w-0 flex-1 truncate px-3 text-[13px] font-semibold md:text-sm">
            {item.name}
          </span>
          {item.onPlay && (
            <Button
              size="icon"
              onClick={item.onPlay}
              aria-label={`Play ${item.name}`}
              className="absolute right-2 hidden h-9 w-9 rounded-full opacity-0 shadow-xl shadow-black/40 transition-opacity hover:scale-105 hover:bg-primary group-hover:opacity-100 focus-visible:opacity-100 md:flex"
            >
              <Play className="ml-0.5 !size-4 fill-current" />
            </Button>
          )}
        </Link>
      ))}
    </div>
  )
}
