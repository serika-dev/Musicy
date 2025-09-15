"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Home, 
  Search, 
  Library, 
  Plus, 
  Heart,
  ListMusic,
  Settings
} from "lucide-react"
import { usePlaylists } from "@/hooks/usePlaylist"
import { useFollowedArtists } from "@/hooks/useFollowedArtists"
import { useDailyMixes } from "@/hooks/useDailyMixes"
import { useProfile } from "@/hooks/useProfile"
import { ArtistImage } from "@/components/artist-image"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession()
  const { data: profile } = useProfile()
  const pathname = usePathname()
  const { data: playlistsData } = usePlaylists(true, 50, 0) // User's playlists
  const { data: followedArtistsData } = useFollowedArtists(5, 0) // Followed artists
  const { data: dailyMixesData } = useDailyMixes() // Daily mixes

  const isActive = (path: string) => pathname === path

  if (!session) return null

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Main Navigation */}
      <Card className="mb-2">
        <CardContent className="p-3">
          <nav className="space-y-2">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href="/">
                <Home className="mr-3 h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button
              variant={isActive("/search") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href="/search">
                <Search className="mr-3 h-4 w-4" />
                Search
              </Link>
            </Button>
            {/* Admin link - only show for admins */}
            {profile?.role === 'ADMIN' && (
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link href="/admin">
                  <Settings className="mr-3 h-4 w-4" />
                  Admin Panel
                </Link>
              </Button>
            )}
          </nav>
        </CardContent>
      </Card>

      {/* Your Library */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-3 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <Button
              variant="ghost"
              className="justify-start p-0 h-auto font-semibold text-muted-foreground hover:text-foreground"
            >
              <Library className="mr-3 h-4 w-4" />
              Your Library
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 pb-6">
            <div className="space-y-2">
              {/* Quick Access */}
              <Button
                variant={isActive("/liked-songs") ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link href="/liked-songs">
                  <div className="w-8 h-8 mr-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded flex items-center justify-center flex-shrink-0">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">Liked Songs</span>
                    <span className="text-xs text-muted-foreground">
                      {/* TODO: Add count */} tracks
                    </span>
                  </div>
                </Link>
              </Button>

              <Separator className="my-4" />

              {/* Daily Mixes */}
              {dailyMixesData && Array.isArray(dailyMixesData) && dailyMixesData.length > 0 && (
                <>
                  <div className="mb-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                      Daily Mixes
                    </span>
                    <div className="space-y-1">
                      {dailyMixesData.slice(0, 3).map((mix: any) => (
                        <Button 
                          key={mix.id} 
                          variant={isActive(`/daily-mixes/${mix.id}`) ? "secondary" : "ghost"}
                          className="w-full justify-start h-auto p-2"
                          asChild
                        >
                          <Link href={`/daily-mixes/${mix.id}`}>
                            <div className="w-8 h-8 mr-3 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                              {mix.coverImageUrl ? (
                                <Image
                                  src={mix.coverImageUrl}
                                  alt={mix.name}
                                  fill
                                  className="object-cover rounded"
                                  sizes="32px"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 rounded flex items-center justify-center">
                                  <div className="text-white text-xs">🎵</div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-start text-left min-w-0 flex-1">
                              <span className="text-sm truncate w-full">{mix.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {mix.tracks?.length || 0} songs
                              </span>
                            </div>
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />
                </>
              )}

              {/* User's Playlists */}
              {playlistsData?.playlists && playlistsData.playlists.length > 0 && (
                <>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                      Made by You
                    </span>
                    <div className="space-y-1">
                      {playlistsData.playlists.map((playlist) => (
                        <Button
                          key={playlist.id}
                          variant={isActive(`/playlists/${playlist.id}`) ? "secondary" : "ghost"}
                          className="w-full justify-start h-auto p-2"
                          asChild
                        >
                          <Link href={`/playlists/${playlist.id}`}>
                            <div className="w-8 h-8 mr-3 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                              {playlist.coverImageUrl ? (
                                <Image
                                  src={playlist.coverImageUrl}
                                  alt={playlist.name}
                                  fill
                                  className="object-cover rounded"
                                  sizes="32px"
                                />
                              ) : (
                                <ListMusic className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col items-start text-left min-w-0 flex-1">
                              <span className="text-sm truncate w-full">
                                {playlist.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Playlist • {playlist._count.tracks} songs
                              </span>
                            </div>
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Separator className="my-4" />
                </>
              )}

              {/* Followed Artists */}
              {followedArtistsData?.artists && followedArtistsData.artists.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Followed Artists
                  </span>
                  <div className="space-y-1">
                    {followedArtistsData.artists.slice(0, 5).map((artist) => (
                      <Button
                        key={artist.id}
                        variant={isActive(`/artists/${artist.id}`) ? "secondary" : "ghost"}
                        className="w-full justify-start h-auto p-2"
                        asChild
                      >
                        <Link href={`/artists/${artist.id}`}>
                          <div className="w-8 h-8 mr-3 bg-muted rounded-full overflow-hidden flex-shrink-0">
                            <ArtistImage
                              artistId={artist.id}
                              artistImageUrl={artist.imageUrl}
                              artistName={artist.name}
                              className="w-full h-full object-cover rounded-full"
                              fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600"
                            />
                          </div>
                          <div className="flex flex-col items-start text-left min-w-0 flex-1">
                            <span className="text-sm truncate w-full">
                              {artist.name}
                              {artist.verified && (
                                <span className="ml-1 text-primary">✓</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {artist._count.tracks} tracks
                            </span>
                          </div>
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
