"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Play, Plus, Lock, Users } from "lucide-react"

interface Playlist {
  id: string
  name: string
  description?: string
  coverImageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  createdAt: string
  owner: {
    id: string
    username?: string
    displayName?: string
    avatarUrl?: string
  }
  _count: {
    tracks: number
    likes: number
  }
}

interface PlaylistsResponse {
  playlists: Playlist[]
  total: number
  limit: number
  offset: number
}

function usePlaylists(userOnly = false, search = "", limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['playlists', userOnly, search, limit, offset],
    queryFn: async (): Promise<PlaylistsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (userOnly) {
        params.append('userOnly', 'true')
      }
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/playlists?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }
      return response.json()
    },
  })
}

export default function PlaylistsPage() {
  const { data: session } = useSession()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showUserOnly, setShowUserOnly] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 20

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  })

  const { data, isLoading, error } = usePlaylists(showUserOnly, debouncedSearch, limit, page * limit)

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const hasMore = data ? (page + 1) * limit < data.total : false

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Playlists</h1>
              <p className="text-muted-foreground text-lg">
                Discover curated collections of music
              </p>
            </div>
            
            {session && (
              <Button asChild>
                <Link href="/playlists/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Link>
              </Button>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search playlists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {session && (
              <div className="flex gap-2">
                <Button
                  variant={showUserOnly ? "default" : "outline"}
                  onClick={() => {
                    setShowUserOnly(!showUserOnly)
                    setPage(0)
                  }}
                >
                  My Playlists
                </Button>
                <Button
                  variant={!showUserOnly ? "default" : "outline"}
                  onClick={() => {
                    setShowUserOnly(false)
                    setPage(0)
                  }}
                >
                  All Playlists
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading && page === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={`playlist-skeleton-${i}`} className="p-4 animate-pulse border-0 bg-transparent shadow-none">
                <CardContent className="p-0">
                  <div className="w-full aspect-square bg-muted rounded-md mb-4" />
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
            <p className="text-muted-foreground">Failed to load playlists. Please try again.</p>
          </div>
        ) : !data?.playlists.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {debouncedSearch 
                ? `No playlists found for "${debouncedSearch}"` 
                : showUserOnly 
                ? "You haven't created any playlists yet" 
                : "No playlists found"
              }
            </p>
            {session && !showUserOnly && (
              <Button className="mt-4" asChild>
                <Link href="/playlists/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Playlist
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Playlists Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {data.playlists.map((playlist) => (
                <Card key={playlist.id} className="group hover:bg-card/60 transition-all duration-300 overflow-hidden cursor-pointer border-0 bg-transparent p-0 shadow-none" asChild>
                  <Link href={`/playlists/${playlist.id}`}>
                    <CardContent className="p-0 space-y-3">
                      <div className="relative aspect-square bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden rounded-md shadow-md">
                        {playlist.coverImageUrl ? (
                          <Image
                            src={playlist.coverImageUrl}
                            alt={playlist.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60">
                            <span className="text-white text-4xl font-bold opacity-40">
                              {playlist.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          <Button
                            size="icon"
                            className="rounded-full w-10 h-10 shadow-lg bg-primary text-primary-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Play className="w-5 h-5 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="px-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm leading-tight truncate">
                            {playlist.name}
                          </h3>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium hover:underline">
                          by {playlist.owner.displayName || playlist.owner.username || 'Unknown'}
                        </p>
                        
                        <div className="flex items-center mt-1 gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-70">
                            Playlist • {playlist._count.tracks}
                          </span>
                          {!playlist.isPublic && (
                            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0 opacity-70" />
                          )}
                          {playlist.isCollaborative && (
                            <Users className="w-3 h-3 text-muted-foreground flex-shrink-0 opacity-70" />
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
              Showing {data.playlists.length} of {data.total} playlists
            </div>
          </>
        )}
      </div>
    </div>
  )
}
