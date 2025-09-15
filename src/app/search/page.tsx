"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrackListItem } from "@/components/track-list-item"
import { Search, Music, User, Album, TrendingUp, Clock } from "lucide-react"
import { useMusicPlayer } from "@/contexts/music-player-context"
import Link from "next/link"

interface SearchResults {
  tracks: any[]
  artists: any[]
  albums: any[]
  playlists: any[]
}

export default function SearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [searchParams])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      // Search tracks
      const tracksResponse = await fetch(`/api/tracks?search=${encodeURIComponent(searchQuery)}&limit=20`)
      const tracksData = tracksResponse.ok ? await tracksResponse.json() : { tracks: [] }

      // Search artists  
      const artistsResponse = await fetch(`/api/artists?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const artistsData = artistsResponse.ok ? await artistsResponse.json() : { artists: [] }

      // Search albums (if you have this endpoint)
      const albumsResponse = await fetch(`/api/albums?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const albumsData = albumsResponse.ok ? await albumsResponse.json() : { albums: [] }

      // Search playlists
      const playlistsResponse = await fetch(`/api/playlists?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const playlistsData = playlistsResponse.ok ? await playlistsResponse.json() : { playlists: [] }

      setResults({
        tracks: tracksData.tracks || [],
        artists: artistsData.artists || [],
        albums: albumsData.albums || [],
        playlists: playlistsData.playlists || []
      })
    } catch (error) {
      console.error('Search error:', error)
      setResults({
        tracks: [],
        artists: [],
        albums: [],
        playlists: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const totalResults = results.tracks.length + results.artists.length + results.albums.length + results.playlists.length

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Search Header */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you want to play?"
              className="pl-12 h-14 text-lg bg-muted/50 border-0 rounded-full"
            />
          </form>
        </div>

        {/* Search Results */}
        {query && (
          <div className="space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
            ) : totalResults > 0 ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="tracks">Songs</TabsTrigger>
                  <TabsTrigger value="artists">Artists</TabsTrigger>
                  <TabsTrigger value="albums">Albums</TabsTrigger>
                  <TabsTrigger value="playlists">Playlists</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                  {/* Top Result */}
                  {(results.tracks[0] || results.artists[0] || results.albums[0]) && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Top result</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="col-span-1 p-6 hover:bg-accent/50 transition-colors">
                          <CardContent className="p-0">
                            {results.tracks[0] ? (
                              <div className="space-y-4">
                                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                                  {results.tracks[0].album?.coverImageUrl ? (
                                    <img
                                      src={results.tracks[0].album.coverImageUrl}
                                      alt={results.tracks[0].title}
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  ) : (
                                    <Music className="w-10 h-10 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold mb-1">{results.tracks[0].title}</h3>
                                  <p className="text-muted-foreground">Song • {results.tracks[0].artist.name}</p>
                                </div>
                                <Button
                                  className="rounded-full w-12 h-12 p-0"
                                  onClick={() => playTrack(results.tracks[0])}
                                >
                                  <Search className="w-5 h-5" />
                                </Button>
                              </div>
                            ) : results.artists[0] ? (
                              <div className="space-y-4">
                                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                                  {results.artists[0].imageUrl ? (
                                    <img
                                      src={results.artists[0].imageUrl}
                                      alt={results.artists[0].name}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <User className="w-10 h-10 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold mb-1">{results.artists[0].name}</h3>
                                  <p className="text-muted-foreground">Artist</p>
                                </div>
                                <Link href={`/artists/${results.artists[0].id}`}>
                                  <Button className="rounded-full w-12 h-12 p-0">
                                    <Search className="w-5 h-5" />
                                  </Button>
                                </Link>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>

                        {/* Quick Results */}
                        <div className="col-span-2 space-y-2">
                          <h3 className="text-xl font-semibold mb-4">Songs</h3>
                          {results.tracks.slice(0, 4).map((track) => (
                            <TrackListItem
                              key={track.id}
                              track={track}
                              isPlaying={isPlaying}
                              isCurrentTrack={isCurrentTrack(track.id)}
                              onPlay={() => playTrack(track)}
                              showAlbum={true}
                              showAddButton={false}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Artists */}
                  {results.artists.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Artists</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {results.artists.slice(0, 6).map((artist) => (
                          <Link key={artist.id} href={`/artists/${artist.id}`}>
                            <Card className="p-4 hover:bg-accent/50 transition-colors">
                              <CardContent className="p-0 text-center space-y-3">
                                <div className="w-full aspect-square bg-muted rounded-full flex items-center justify-center">
                                  {artist.imageUrl ? (
                                    <img
                                      src={artist.imageUrl}
                                      alt={artist.name}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <User className="w-12 h-12 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold truncate">{artist.name}</h3>
                                  <p className="text-sm text-muted-foreground">Artist</p>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tracks">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold mb-4">Songs</h2>
                    {results.tracks.map((track) => (
                      <TrackListItem
                        key={track.id}
                        track={track}
                        isPlaying={isPlaying}
                        isCurrentTrack={isCurrentTrack(track.id)}
                        onPlay={() => playTrack(track)}
                        showAlbum={true}
                        showAddButton={true}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="artists">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {results.artists.map((artist) => (
                      <Link key={artist.id} href={`/artists/${artist.id}`}>
                        <Card className="p-4 hover:bg-accent/50 transition-colors">
                          <CardContent className="p-0 text-center space-y-3">
                            <div className="w-full aspect-square bg-muted rounded-full flex items-center justify-center">
                              {artist.imageUrl ? (
                                <img
                                  src={artist.imageUrl}
                                  alt={artist.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <User className="w-12 h-12 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold truncate">{artist.name}</h3>
                              <p className="text-sm text-muted-foreground">Artist</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="albums">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {results.albums.map((album) => (
                      <Link key={album.id} href={`/albums/${album.id}`}>
                        <Card className="p-4 hover:bg-accent/50 transition-colors">
                          <CardContent className="p-0 text-center space-y-3">
                            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                              {album.coverImageUrl ? (
                                <img
                                  src={album.coverImageUrl}
                                  alt={album.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Album className="w-12 h-12 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold truncate">{album.title}</h3>
                              <p className="text-sm text-muted-foreground">Album</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="playlists">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {results.playlists.map((playlist) => (
                      <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                        <Card className="p-4 hover:bg-accent/50 transition-colors">
                          <CardContent className="p-0 text-center space-y-3">
                            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                              {playlist.coverImageUrl ? (
                                <img
                                  src={playlist.coverImageUrl}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Music className="w-12 h-12 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold truncate">{playlist.name}</h3>
                              <p className="text-sm text-muted-foreground">Playlist</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found for "{query}"</h3>
                <p className="text-muted-foreground">
                  Try searching for something else or check your spelling.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Browse without search */}
        {!query && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Browse all</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[
                  { name: "Recently Played", color: "from-purple-600 to-purple-800", icon: Clock },
                  { name: "Made For You", color: "from-blue-600 to-blue-800", icon: Music },
                  { name: "Charts", color: "from-green-600 to-green-800", icon: TrendingUp },
                  { name: "Pop", color: "from-pink-600 to-pink-800", icon: Music },
                  { name: "Hip-Hop", color: "from-orange-600 to-orange-800", icon: Music },
                  { name: "Rock", color: "from-red-600 to-red-800", icon: Music },
                  { name: "Jazz", color: "from-yellow-600 to-yellow-800", icon: Music },
                  { name: "Electronic", color: "from-cyan-600 to-cyan-800", icon: Music },
                  { name: "Classical", color: "from-indigo-600 to-indigo-800", icon: Music },
                  { name: "Country", color: "from-amber-600 to-amber-800", icon: Music },
                ].map((category, index) => (
                  <Card key={index} className={`relative overflow-hidden cursor-pointer hover:scale-105 transition-transform bg-gradient-to-br ${category.color}`}>
                    <CardContent className="p-6 h-24 flex items-end relative">
                      <h3 className="font-bold text-white text-lg">{category.name}</h3>
                      <category.icon className="absolute top-2 right-2 w-8 h-8 text-white/80 rotate-12" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
