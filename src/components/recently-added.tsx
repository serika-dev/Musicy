"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Music } from "lucide-react"
import { useStats } from "@/hooks/useStats"
import { TrackListItem } from "@/components/track-list-item"
import { useMusicPlayer } from "@/contexts/music-player-context"

export function RecentlyAdded() {
  const { data: statsData, isLoading } = useStats()
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 rounded-md animate-pulse">
            <div className="w-12 h-12 bg-muted rounded-md"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted rounded mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
            <div className="w-8 h-3 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const recentTracks = statsData?.recentTracks || []

  if (recentTracks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No recent tracks available yet. Check back later!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {recentTracks.slice(0, 5).map((track) => (
        <TrackListItem
          key={track.id}
          track={track}
          isCurrentTrack={isCurrentTrack(track.id)}
          isPlaying={isCurrentTrack(track.id) && isPlaying}
          onPlay={() => playTrack(track)}
          showAddButton={true}
        />
      ))}
    </div>
  )
}
