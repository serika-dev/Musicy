"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { TrackListItem } from "@/components/track-list-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Music, Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface TracksResponse {
  tracks: any[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function TracksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<TracksResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const limit = 30

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: (page * limit).toString(),
        })
        if (search) params.set("search", search)

        const res = await fetch(`/api/tracks?${params}`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error("Failed to fetch tracks:", err)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchTracks, search ? 300 : 0)
    return () => clearTimeout(debounce)
  }, [page, search])

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
          Browse Tracks
        </h1>
        <p className="text-muted-foreground font-medium">
          Explore the full catalogue — {data?.total ?? "..."} tracks available in lossless quality.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search tracks by title or artist…"
          className="pl-12 h-12 rounded-xl bg-muted/40 border-0 focus-visible:ring-primary/20 text-base"
        />
      </div>

      {/* Track list */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/5" />
              </div>
            </div>
          ))
        ) : data?.tracks?.length ? (
          data.tracks.map((track, idx) => (
            <div key={track.id} className="flex items-center group/item hover:bg-white/5 rounded-2xl transition-colors pr-2">
              <div className="w-10 text-center text-xs font-bold text-muted-foreground group-hover/item:text-foreground shrink-0">
                {page * limit + idx + 1}
              </div>
              <div className="flex-1 overflow-hidden">
                <TrackListItem
                  track={track}
                  isPlaying={isCurrentTrack(track.id) && isPlaying}
                  isCurrentTrack={isCurrentTrack(track.id)}
                  onPlay={() => playTrack(track, data.tracks, { type: 'standalone', id: 'tracks', name: 'Browse Tracks' })}
                  showAddButton={true}
                  className="bg-transparent hover:bg-transparent border-none"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-white/10">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-xl font-bold">No tracks found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground font-bold">
            Page {page + 1} of {Math.ceil(data.total / limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasMore}
            onClick={() => setPage(p => p + 1)}
            className="rounded-full"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
