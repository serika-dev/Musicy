"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { usePlaylists, useCreatePlaylist } from "@/hooks/usePlaylist"
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
  const { data: playlistsData } = usePlaylists(true, 50, 0)
  const { data: followedArtistsData } = useFollowedArtists(10, 0)
  const { data: dailyMixesData } = useDailyMixes()
  const { mutate: createPlaylist, isPending: isCreating } = useCreatePlaylist()

  const handleCreatePlaylist = () => {
    createPlaylist({
      name: `My Playlist #${(playlistsData?.total || 0) + 1}`,
      isPublic: true
    })
  }

  const isActive = (path: string) => pathname === path

  if (!session) return null

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Navigation */}
      <div className="bg-card/50 rounded-md p-2 mb-2">
        <nav className="space-y-0.5">
          <Button
            variant={isActive("/") ? "secondary" : "ghost"}
            className="w-full justify-start h-9 text-sm"
            asChild
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button
            variant={isActive("/search") ? "secondary" : "ghost"}
            className="w-full justify-start h-9 text-sm"
            asChild
          >
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>
          {profile?.role === 'ADMIN' && (
            <Button
              variant={isActive("/admin") ? "secondary" : "ghost"}
              className="w-full justify-start h-9 text-sm"
              asChild
            >
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
        </nav>
      </div>

      {/* Library */}
      <div className="flex-1 flex flex-col min-h-0 bg-card/50 rounded-md">
        <div className="flex items-center justify-between p-3 pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Library className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Library</span>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 hover:bg-white/10" 
            onClick={handleCreatePlaylist}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-2 pb-4">
          <div className="space-y-0.5">
            {/* Liked Songs */}
            <Button
              variant={isActive("/liked-songs") ? "secondary" : "ghost"}
              className="w-full justify-start h-auto py-2"
              asChild
            >
              <Link href="/liked-songs">
                <div className="w-8 h-8 mr-2 bg-gradient-to-br from-primary/80 to-primary rounded flex items-center justify-center flex-shrink-0">
                  <Heart className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-sm">Liked Songs</span>
                  <span className="text-[11px] text-muted-foreground">Playlist</span>
                </div>
              </Link>
            </Button>

            <Separator className="my-2" />

            {/* Daily Mixes */}
            {dailyMixesData && Array.isArray(dailyMixesData) && dailyMixesData.length > 0 && (
              <>
                {dailyMixesData.slice(0, 3).map((mix: any) => (
                  <Button 
                    key={mix.id} 
                    variant={isActive(`/daily-mixes/${mix.id}`) ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto py-1.5"
                    asChild
                  >
                    <Link href={`/daily-mixes/${mix.id}`}>
                      <div className="w-8 h-8 mr-2 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                        {mix.coverImageUrl ? (
                          <Image src={mix.coverImageUrl} alt={mix.name} fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/80 rounded flex items-center justify-center">
                            <ListMusic className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <span className="text-sm truncate w-full">{mix.name}</span>
                        <span className="text-[11px] text-muted-foreground">{mix.tracks?.length || 0} songs</span>
                      </div>
                    </Link>
                  </Button>
                ))}
                <Separator className="my-2" />
              </>
            )}

            {/* Playlists */}
            {playlistsData?.playlists && playlistsData.playlists.length > 0 && (
              <>
                {playlistsData.playlists.map((playlist) => (
                  <Button
                    key={playlist.id}
                    variant={isActive(`/playlists/${playlist.id}`) ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto py-1.5"
                    asChild
                  >
                    <Link href={`/playlists/${playlist.id}`}>
                      <div className="w-8 h-8 mr-2 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                        {playlist.coverImageUrl ? (
                          <Image src={playlist.coverImageUrl} alt={playlist.name} fill className="object-cover" sizes="32px" />
                        ) : (
                          <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <span className="text-sm truncate w-full">{playlist.name}</span>
                        <span className="text-[11px] text-muted-foreground">Playlist · {playlist._count.tracks} songs</span>
                      </div>
                    </Link>
                  </Button>
                ))}
                <Separator className="my-2" />
              </>
            )}

            {/* Followed Artists */}
            {followedArtistsData?.artists && followedArtistsData.artists.length > 0 && (
              <div className="space-y-0.5">
                {followedArtistsData.artists.slice(0, 5).map((artist) => (
                  <Button
                    key={artist.id}
                    variant={isActive(`/artists/${artist.id}`) ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto py-1.5"
                    asChild
                  >
                    <Link href={`/artists/${artist.id}`}>
                      <div className="w-8 h-8 mr-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <ArtistImage
                          artistId={artist.id}
                          artistImageUrl={artist.imageUrl}
                          artistName={artist.name}
                          className="w-full h-full object-cover rounded-full"
                          fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/60"
                        />
                      </div>
                      <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <span className="text-sm truncate w-full">
                          {artist.name}
                          {artist.verified && <span className="ml-1 text-primary text-xs">✓</span>}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Artist · {artist._count.tracks} tracks</span>
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
