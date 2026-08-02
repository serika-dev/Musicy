"use client"

import { Music } from "lucide-react"
import { useStats } from "@/hooks/useStats"
import { Carousel, CarouselSlide } from "@/components/shared/carousel"
import { MediaCard } from "@/components/shared/media-card"
import { useMusicPlayer } from "@/contexts/music-player-context"

export function NewReleasesCards() {
  const { data: statsData, isLoading } = useStats()
  const { playTrack } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none basis-[calc(45%-0.75rem)] sm:basis-[calc(33.333%-0.75rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.75rem)] xl:basis-[calc(16.666%-0.75rem)] animate-pulse">
            <div className="aspect-square w-full bg-muted rounded-lg mb-2" />
            <div className="h-4 bg-muted rounded mb-1 w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const recentTracks = statsData?.recentTracks || []

  if (recentTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No new tracks available yet.</p>
      </div>
    )
  }

  return (
    <Carousel>
      {recentTracks.slice(0, 12).map((track) => (
        <CarouselSlide key={track.id}>
          <MediaCard
            href={`/tracks/${track.id}`}
            title={track.title}
            subtitle={track.artist?.name}
            subtitleHref={track.artist ? `/artists/${track.artist.id}` : undefined}
            imageUrl={track.album?.coverImageUrl}
            onPlay={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(track) }}
          />
        </CarouselSlide>
      ))}
    </Carousel>
  )
}
