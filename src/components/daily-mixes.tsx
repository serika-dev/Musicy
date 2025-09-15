"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDailyMixes } from "@/hooks/useDailyMixes"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { Play, Pause } from "lucide-react"

export function DailyMixes() {
  const { data: dailyMixes, isLoading, error } = useDailyMixes()
  const { playTrack, isPlaying, currentTrack } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <CardContent className="p-0">
              <div className="w-full aspect-square bg-muted rounded-lg mb-4"></div>
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !dailyMixes || dailyMixes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl opacity-50 mb-4">🎵</div>
          <p className="text-muted-foreground">
            Daily mixes will appear here based on your listening history and preferences.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handlePlayMix = (mix: any) => {
    if (mix.tracks && mix.tracks.length > 0) {
      playTrack(mix.tracks[0], mix.tracks, {
        type: 'daily-mix',
        name: mix.name
      })
    }
  }

  const isCurrentMixPlaying = (mix: any) => {
    return mix.tracks?.some((track: any) => 
      currentTrack?.id === track.id && isPlaying
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {dailyMixes.map((mix) => (
        <Card 
          key={mix.id} 
          className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer border-0 bg-gradient-to-br from-card via-card to-muted/20"
        >
          <Link href={`/daily-mixes/${mix.id}`}>
            <CardContent className="p-0">
              {/* Cover Image Container */}
              <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 overflow-hidden">
                {mix.coverImageUrl ? (
                  <Image
                    src={mix.coverImageUrl}
                    alt={mix.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60">
                    <div className="text-6xl opacity-40">🎵</div>
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="lg"
                    className={`rounded-full w-14 h-14 shadow-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 ${
                      isCurrentMixPlaying(mix) 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-white/90 hover:bg-white text-black'
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePlayMix(mix)
                    }}
                  >
                    {isCurrentMixPlaying(mix) ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Mix Info */}
              <div className="p-5 space-y-3">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {mix.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {mix.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    {mix.tracks?.length || 0} tracks
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Daily Mix
                  </div>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )
}
