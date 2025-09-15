"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Play, Music } from "lucide-react"

interface Album {
  id: string
  title: string
  coverImageUrl?: string
  releaseDate?: string
  albumType: 'ALBUM' | 'EP' | 'SINGLE'
  genre?: string
  artist: {
    id: string
    name: string
    verified: boolean
  }
  _count: {
    tracks: number
  }
}

interface AlbumsResponse {
  albums: Album[]
  total: number
  limit: number
  offset: number
}

function useAlbums(search: string, limit = 24, offset = 0) {
  return useQuery({
    queryKey: ['albums', search, limit, offset],
    queryFn: async (): Promise<AlbumsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/albums?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }
      return response.json()
    },
  })
}

export default function AlbumsPage() {
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

  const { data, isLoading, error } = useAlbums(debouncedSearch, limit, page * limit)

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
            <h1 className="text-4xl font-bold">Albums</h1>
            <p className="text-muted-foreground text-lg">
              Discover albums from your favorite artists
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search albums..."
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
              <Card key={`album-loading-${i}`} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="w-full aspect-square bg-muted rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load albums. Please try again.</p>
          </div>
        ) : !data?.albums.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {debouncedSearch ? `No albums found for "${debouncedSearch}"` : "No albums found"}
            </p>
          </div>
        ) : (
          <>
            {/* Albums Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {data.albums.filter(album => album && album.id && album.title).map((album) => (
                <Card key={album.id} className="group hover:bg-accent/50 transition-colors cursor-pointer">
                  <Link href={`/albums/${album.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="relative w-full aspect-square bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mx-auto overflow-hidden">
                        {album.coverImageUrl ? (
                          <Image
                            src={album.coverImageUrl}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-12 h-12 text-white/80" />
                          </div>
                        )}
                        <Button
                          size="icon"
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold truncate text-lg">{album.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            <button 
                              type="button"
                              className="hover:text-foreground cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = `/artists/${album.artist.id}`
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  window.location.href = `/artists/${album.artist.id}`
                                }
                              }}
                            >
                              {album.artist.name}
                              {album.artist.verified && <span className="ml-1 text-primary">✓</span>}
                            </button>
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{album._count.tracks} tracks</span>
                          {album.releaseDate && (
                            <span>{new Date(album.releaseDate).getFullYear()}</span>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {album.albumType === 'SINGLE' ? 'Single' : 
                             album.albumType === 'EP' ? 'EP' : 'Album'}
                          </Badge>
                          {album.genre && (
                            <Badge variant="secondary" className="text-xs">
                              {album.genre}
                            </Badge>
                          )}
                        </div>
                      </div>
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
              Showing {data.albums.length} of {data.total} albums
            </div>
          </>
        )}
      </div>
    </div>
  )
}
