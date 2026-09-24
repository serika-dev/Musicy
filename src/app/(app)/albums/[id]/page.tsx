"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  Music,
  Pause,
  Play,
  Share,
  Shuffle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShareMenu } from "@/components/share-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useArtworkColor } from "@/hooks/useArtworkColor";
import { formatDuration } from "@/lib/utils";

interface Album {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  releaseDate?: string;
  genre?: string;
  albumType: "ALBUM" | "EP" | "SINGLE";
  isPublic: boolean;
  createdAt: string;
  artist: {
    id: string;
    name: string;
    verified: boolean;
  };
  tracks: Array<{
    id: string;
    title: string;
    duration: number;
    coverImageUrl?: string;
    filePath: string;
    format: string;
    trackNumber?: number;
    playCount?: number;
    artist: {
      id: string;
      name: string;
      verified: boolean;
    };
    album?: {
      id: string;
      title: string;
      coverImageUrl?: string;
    };
  }>;
  _count: {
    tracks: number;
  };
}

function useAlbum(id: string) {
  return useQuery<Album>({
    queryKey: ["album", id],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch album");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

const albumTypeLabel = (type: Album["albumType"]) =>
  type === "SINGLE" ? "Single" : type === "EP" ? "EP" : "Album";

export default function AlbumPage() {
  const params = useParams();
  const albumId = params.id as string;

  const { data: album, isLoading, error } = useAlbum(albumId);
  const {
    playTrack,
    isCurrentTrack,
    isPlaying,
    currentTrack,
    togglePlayPause,
    isShuffle,
    toggleShuffle,
  } = useMusicPlayer();
  const tint = useArtworkColor(album?.coverImageUrl);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="h-56 w-56 shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-4">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-12 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <TrackListSkeleton count={8} />
      </div>
    );
  }

  if (error || !album) {
    return (
      <EmptyState
        icon={<Music />}
        title="Album not found"
        description="This album doesn't exist or is not available."
        action={<Button onClick={() => window.history.back()}>Go back</Button>}
      />
    );
  }

  const handlePlayAll = () => {
    if (allTracks.length > 0) {
      playTrack(allTracks[0], allTracks, {
        type: "album",
        id: album.id,
        name: album.title,
      });
    }
  };

  const handleShuffle = () => {
    if (allTracks.length === 0) return;
    if (!isShuffle) toggleShuffle();
    const start = allTracks[Math.floor(Math.random() * allTracks.length)];
    playTrack(start, allTracks, {
      type: "album",
      id: album.id,
      name: album.title,
    });
  };

  const totalDuration =
    album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || 0;
  const releaseDate = album.releaseDate ? new Date(album.releaseDate) : null;

  // Compilations credit one album artist but hold many performers — the hero
  // credits the actual track artists, top few by track count.
  const performerCounts = new Map<string, { name: string; count: number }>();
  for (const track of album.tracks ?? []) {
    if (!track.artist?.id) continue;
    const entry = performerCounts.get(track.artist.id);
    if (entry) entry.count += 1;
    else performerCounts.set(track.artist.id, { name: track.artist.name, count: 1 });
  }
  const performers = [...performerCounts.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count);
  const heroArtistNames = performers.slice(0, 3).map((p) => p.name);
  const isMultiPerformer = performers.length > 1;
  const isAlbumPlaying =
    isPlaying &&
    !!currentTrack &&
    album.tracks?.some((t) => t.id === currentTrack.id);
  const allTracks = [...(album.tracks || [])].sort(
    (a, b) => (a.trackNumber || 0) - (b.trackNumber || 0),
  );
  const hasDescription = !!album.description?.trim();
  const sortedTracks = hasDescription
    ? allTracks
    : [...allTracks].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Hero — tinted with the cover's colour, fading into the page */}
      <div
        className="-mx-4 -mt-4 px-4 pb-6 pt-8 transition-[background] duration-700 md:-mx-6 md:-mt-6 md:px-6 md:pt-12 lg:-mx-8 lg:px-8"
        style={{
          background: `linear-gradient(180deg, ${tint ? `color-mix(in srgb, ${tint} 55%, transparent)` : "hsl(var(--primary) / 0.25)"} 0%, transparent 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-md bg-secondary shadow-[0_8px_40px_rgba(0,0,0,0.55)] sm:h-52 sm:w-52 lg:h-60 lg:w-60">
            {album.coverImageUrl ? (
              <Image
                src={album.coverImageUrl}
                alt={album.title}
                fill
                className="object-cover"
                sizes="240px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="h-20 w-20 text-muted-foreground/60" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-medium text-foreground/80">
              {albumTypeLabel(album.albumType)}
            </p>
            <p
              className="break-words text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl"
              aria-hidden="true"
            >
              {album.title}
            </p>
            {album.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{album.description}</p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-foreground/70 sm:justify-start">
              {isMultiPerformer ? (
                <span className="font-semibold text-foreground">
                  {heroArtistNames.join(", ")}
                  {performers.length > heroArtistNames.length &&
                    ` +${performers.length - heroArtistNames.length} more`}
                </span>
              ) : (
                <Link
                  href={`/artists/${album.artist.id}`}
                  className="inline-flex items-center font-semibold text-foreground hover:underline"
                >
                  {album.artist.name}
                  {album.artist.verified && (
                    <BadgeCheck className="ml-1 h-4 w-4 text-primary" aria-label="Verified" />
                  )}
                </Link>
              )}
              {releaseDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{releaseDate.getFullYear()}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                {album._count.tracks} {album._count.tracks === 1 ? "song" : "songs"},{" "}
                <span className="text-foreground/55">{formatDuration(totalDuration)}</span>
              </span>
              {album.genre && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{album.genre}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-5">
        <Button
          size="icon"
          onClick={isAlbumPlaying ? togglePlayPause : handlePlayAll}
          disabled={!album.tracks || album.tracks.length === 0}
          aria-label={isAlbumPlaying ? "Pause" : `Play ${album.title}`}
          className="h-14 w-14 rounded-full shadow-xl shadow-black/40 hover:scale-105 hover:bg-primary"
        >
          {isAlbumPlaying ? (
            <Pause className="!size-6 fill-current" />
          ) : (
            <Play className="ml-0.5 !size-6 fill-current" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleShuffle}
          disabled={!album.tracks || album.tracks.length === 0}
          aria-label="Shuffle play"
          className="h-10 w-10 text-muted-foreground hover:bg-transparent hover:text-foreground hover:scale-105"
        >
          <Shuffle className="!size-6" />
        </Button>

        <ShareMenu
          title={album.title}
          url={`/albums/${album.id}`}
          id={album.id}
          type="album"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Share"
              className="h-10 w-10 text-muted-foreground hover:bg-transparent hover:text-foreground hover:scale-105"
            >
              <Share className="!size-5" />
            </Button>
          }
        />
      </div>

      {/* Tracks */}
      <section>
        {!hasDescription && sortedTracks.length > 0 && (
          <p className="pb-3 text-sm font-semibold">
            Top {sortedTracks.length} tracks
          </p>
        )}
        {sortedTracks.length > 0 && (
          <div className="mb-2 hidden items-center gap-4 border-b border-border px-3 pb-2 text-[13px] text-muted-foreground sm:flex">
            <span className="w-6 text-center">#</span>
            <span className="flex-1">Title</span>
            <Clock className="mr-9 h-4 w-4" aria-label="Duration" />
          </div>
        )}
        {sortedTracks.length > 0 ? (
          sortedTracks.map((track, index) => (
            <TrackListItem
              key={track.id}
              track={track}
              index={hasDescription ? (track.trackNumber ? track.trackNumber - 1 : index) : index}
              showArtwork={isMultiPerformer}
              isCurrentTrack={isCurrentTrack(track.id)}
              isPlaying={isCurrentTrack(track.id) && isPlaying}
              onPlay={() =>
                playTrack(track, allTracks, {
                  type: "album",
                  id: album.id,
                  name: album.title,
                })
              }
              showAlbum={false}
              showAddButton={true}
            />
          ))
        ) : (
          <EmptyState
            icon={<Music />}
            title="No tracks in this album"
            description="This album doesn't have any tracks yet."
          />
        )}
      </section>
    </div>
  );
}
