"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BadgeCheck,
  Download,
  Heart,
  Library,
  ListMusic,
  Plus,
  Sparkles,
  Volume2,
  X,
} from "lucide-react"
import { usePlaylists, useCreatePlaylist } from "@/hooks/usePlaylist"
import { useFollowedArtists } from "@/hooks/useFollowedArtists"
import { useDailyMixes } from "@/hooks/useDailyMixes"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { ArtistImage } from "@/components/artist-image"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

type LibraryFilter = "all" | "playlists" | "artists" | "mixes"

const FILTERS: { id: Exclude<LibraryFilter, "all">; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "artists", label: "Artists" },
  { id: "mixes", label: "Mixes" },
]

interface LibraryRowProps {
  href: string
  title: string
  subtitle: React.ReactNode
  art: React.ReactNode
  active: boolean
  playing?: boolean
}

function LibraryRow({ href, title, subtitle, art, active, playing }: LibraryRowProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-md p-2 transition-colors",
        active ? "bg-accent" : "hover:bg-panel-hover",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden">{art}</div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] leading-tight", playing ? "text-primary" : "text-foreground")}>
          {title}
        </p>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {playing && <Volume2 className="h-4 w-4 shrink-0 text-primary" aria-label="Now playing" />}
    </Link>
  )
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [filter, setFilter] = useState<LibraryFilter>("all")
  const { data: playlistsData } = usePlaylists(true, 50, 0)
  const { data: followedArtistsData } = useFollowedArtists(20, 0)
  const { data: dailyMixesData } = useDailyMixes()
  const { mutate: createPlaylist, isPending: isCreating } = useCreatePlaylist()
  const { playbackContext, currentTrack } = useMusicPlayer()

  const handleCreatePlaylist = () => {
    createPlaylist({
      name: `My Playlist #${(playlistsData?.total || 0) + 1}`,
      isPublic: true,
    })
  }

  const isActive = (path: string) => pathname === path
  // The row whose collection is feeding the queue gets a speaker glyph.
  const isPlayingFrom = (type: string, id: string) =>
    !!currentTrack && playbackContext?.type === type && playbackContext?.id === id

  if (!session) return null

  const mixes = Array.isArray(dailyMixesData) ? dailyMixesData : []
  const playlists = playlistsData?.playlists ?? []
  const artists = followedArtistsData?.artists ?? []

  const show = (f: Exclude<LibraryFilter, "all">) => filter === "all" || filter === f
  const nothingToShow =
    (show("playlists") ? playlists.length : 0) +
      (show("artists") ? artists.length : 0) +
      (show("mixes") ? mixes.length : 0) ===
    0

  return (
    <div className={cn("app-panel flex flex-col rounded-xl", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <Link
          href="/playlists"
          className="flex items-center gap-2.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Library className="h-5 w-5" />
          <span>Your Library</span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={handleCreatePlaylist}
              disabled={isCreating}
              aria-label="Create playlist"
            >
              <Plus className="!size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create playlist</TooltipContent>
        </Tooltip>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar">
        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-label="Clear filter"
            className="chip w-8 justify-center px-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            data-active={filter === f.id}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(filter === f.id ? "all" : f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
        <div className="space-y-0.5 pb-2">
          {/* Pinned collections */}
          {show("playlists") && (
            <>
              <LibraryRow
                href="/liked-songs"
                title="Liked Songs"
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    <span className="text-primary">●</span> Playlist
                  </span>
                }
                active={isActive("/liked-songs")}
                art={
                  <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-300">
                    <Heart className="h-5 w-5 fill-white text-white" />
                  </div>
                }
              />
              <LibraryRow
                href="/downloads"
                title="Downloads"
                subtitle="Offline library"
                active={isActive("/downloads")}
                art={
                  <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-teal-300">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                }
              />
            </>
          )}

          {show("mixes") &&
            mixes.slice(0, filter === "mixes" ? undefined : 3).map((mix: any) => (
              <LibraryRow
                key={mix.id}
                href={`/daily-mixes/${mix.id}`}
                title={mix.name}
                subtitle={`Mix · ${mix.tracks?.length || 0} songs`}
                active={isActive(`/daily-mixes/${mix.id}`)}
                playing={isPlayingFrom("daily-mix", mix.id)}
                art={
                  mix.coverImageUrl ? (
                    <Image src={mix.coverImageUrl} alt="" fill className="rounded-md object-cover" sizes="48px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-primary/50 to-primary">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                  )
                }
              />
            ))}

          {show("playlists") &&
            playlists.map((playlist) => (
              <LibraryRow
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                title={playlist.name}
                subtitle={`Playlist · ${playlist._count.tracks} songs`}
                active={isActive(`/playlists/${playlist.id}`)}
                playing={isPlayingFrom("playlist", playlist.id)}
                art={
                  playlist.coverImageUrl ? (
                    <Image src={playlist.coverImageUrl} alt="" fill className="rounded-md object-cover" sizes="48px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
                      <ListMusic className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )
                }
              />
            ))}

          {show("artists") &&
            artists.map((artist) => (
              <LibraryRow
                key={artist.id}
                href={`/artists/${artist.id}`}
                title={artist.name}
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    Artist
                    {artist.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-label="Verified" />}
                  </span>
                }
                active={isActive(`/artists/${artist.id}`)}
                art={
                  <ArtistImage
                    artistId={artist.id}
                    artistImageUrl={artist.imageUrl}
                    artistName={artist.name}
                    className="h-full w-full rounded-full object-cover"
                    fallbackClassName="flex h-full w-full items-center justify-center rounded-full bg-secondary"
                  />
                }
              />
            ))}

          {nothingToShow && filter !== "all" && (
            <div className="mx-2 mt-2 rounded-lg bg-secondary/60 p-4">
              <p className="text-sm font-semibold">
                {filter === "artists"
                  ? "Follow your first artist"
                  : filter === "mixes"
                    ? "Your mixes are brewing"
                    : "Create your first playlist"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {filter === "artists"
                  ? "Tap follow on any artist page to keep them here."
                  : filter === "mixes"
                    ? "Listen to a few songs and daily mixes will appear."
                    : "It's easy, we'll help you."}
              </p>
              {filter === "playlists" && (
                <Button
                  size="sm"
                  onClick={handleCreatePlaylist}
                  disabled={isCreating}
                  className="mt-3 rounded-full bg-foreground px-4 font-semibold text-background hover:bg-foreground/90"
                >
                  Create playlist
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
