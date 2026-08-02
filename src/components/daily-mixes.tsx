"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useDailyMixes } from "@/hooks/useDailyMixes"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { Carousel, CarouselSlide } from "@/components/shared/carousel"
import { MediaCard } from "@/components/shared/media-card"

export function DailyMixes() {
  const { data: dailyMixes, isLoading, error } = useDailyMixes()
  const { playTrack } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none basis-[calc(45%-0.75rem)] sm:basis-[calc(33.333%-0.75rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.75rem)] xl:basis-[calc(16.666%-0.75rem)] animate-pulse">
            <div className="aspect-square bg-muted rounded-lg mb-2" />
            <div className="h-4 bg-muted rounded mb-1 w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
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

  return (
    <Carousel>
      {dailyMixes.map((mix) => (
        <CarouselSlide key={mix.id}>
          <MediaCard
            href={`/daily-mixes/${mix.id}`}
            title={mix.name}
            subtitle={mix.description}
            imageUrl={mix.coverImageUrl}
            badge={`${mix.tracks?.length || 0} tracks`}
            onPlay={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayMix(mix) }}
          />
        </CarouselSlide>
      ))}
    </Carousel>
  )
}
