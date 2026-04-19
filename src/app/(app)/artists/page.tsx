"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArtistImage } from "@/components/artist-image"
import { Search, Play } from "lucide-react"

interface Artist {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  verified: boolean
  _count: {
    tracks: number
    albums: number
    followers: number
  }
}

interface ArtistsResponse {
  artists: Artist[]
  total: number
  limit: number
  offset: number
}

function useArtists(search: string, limit = 24, offset = 0) {
  return useQuery({
    queryKey: ['artists', search, limit, offset],
    queryFn: async (): Promise<ArtistsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/artists?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch artists')
      }
      return response.json()
    },
  })
}

export default function ArtistsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)
  const limit = 24

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  })

  const { data, isLoading, error } = useArtists(debouncedSearch, limit, page * limit)

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const hasMore = data ? (page + 1) * limit < data.total : false

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Artists</h1>
            <p className="text-muted-foreground text-lg">
              Discover talented artists and their music
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading && page === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={`artist-skeleton-${i}`} className="animate-pulse">
                <CardContent className="p-4 text-center space-y-3">
                  <div className="w-full aspect-square bg-muted rounded-full mx-auto" />
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load artists. Please try again.</p>
          </div>
        ) : !data?.artists.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {debouncedSearch ? `No artists found for "${debouncedSearch}"` : "No artists found"}
            </p>
          </div>
        ) : (
          <>
            {/* Artists Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {data.artists.map((artist) => (
                <Card key={artist.id} className="group hover:bg-accent/50 transition-colors cursor-pointer" asChild>
                  <Link href={`/artists/${artist.id}`}>
                    <CardContent className="p-4 text-center space-y-3">
                      <div className="w-full aspect-square bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto overflow-hidden">
                        <ArtistImage
                          artistId={artist.id}
                          artistImageUrl={artist.imageUrl}
                          artistName={artist.name}
                          className="w-full h-full object-cover rounded-full"
                          fallbackClassName="w-full h-full flex items-center justify-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold truncate flex items-center justify-center gap-1">
                          {artist.name}
                          {artist.verified && <span className="text-primary">✓</span>}
                        </h3>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{artist._count.tracks} tracks</p>
                          <p>{artist._count.albums} albums</p>
                          {artist._count.followers > 0 && (
                            <p>{artist._count.followers.toLocaleString()} followers</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}

            {/* Results Info */}
            <div className="text-center text-sm text-muted-foreground">
              Showing {data.artists.length} of {data.total} artists
            </div>
          </>
        )}
      </div>
    </div>
  )
}
