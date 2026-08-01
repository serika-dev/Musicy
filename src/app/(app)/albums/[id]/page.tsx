"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Heart,
  Music,
  Pause,
  Play,
  Share,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShareMenu } from "@/components/share-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
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
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } =
    useMusicPlayer();

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
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks, {
        type: "album",
        id: album.id,
        name: album.title,
      });
    }
  };

  const totalDuration =
    album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || 0;
  const releaseDate = album.releaseDate ? new Date(album.releaseDate) : null;
  const isAlbumPlaying =
    isPlaying &&
    !!currentTrack &&
    album.tracks?.some((t) => t.id === currentTrack.id);
  const sortedTracks = [...(album.tracks || [])].sort(
    (a, b) => (a.trackNumber || 0) - (b.trackNumber || 0),
  );

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <div className="relative h-52 w-52 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-primary/60 shadow-2xl shadow-primary/20 sm:h-56 sm:w-56">
          {album.coverImageUrl ? (
            <Image
              src={album.coverImageUrl}
              alt={album.title}
              fill
              className="object-cover"
              sizes="224px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-24 w-24 text-white/80" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <Badge variant="secondary">{albumTypeLabel(album.albumType)}</Badge>
            <p className="text-4xl font-black tracking-tight sm:text-6xl" aria-hidden="true">
              {album.title}
            </p>
            {album.description && (
              <p className="text-muted-foreground">{album.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            <Link
              href={`/artists/${album.artist.id}`}
              className="inline-flex items-center font-semibold text-foreground hover:underline"
            >
              {album.artist.name}
              {album.artist.verified && (
                <BadgeCheck className="ml-1 h-4 w-4 text-primary" />
              )}
            </Link>
            {releaseDate && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {releaseDate.getFullYear()}
                </span>
              </>
            )}
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(totalDuration)}
            </span>
            <span>•</span>
            <span>{album._count.tracks} tracks</span>
            {album.genre && (
              <>
                <span>•</span>
                <span>{album.genre}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!album.tracks || album.tracks.length === 0}
              className="rounded-full shadow-lg shadow-primary/30"
            >
              {isAlbumPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
              {isAlbumPlaying ? "Pause" : "Play"}
            </Button>

            <Button variant="outline" size="lg" className="rounded-full">
              <Heart className="h-5 w-5" />
              Like
            </Button>

            <ShareMenu
              title={album.title}
              url={`/albums/${album.id}`}
              id={album.id}
              type="album"
              trigger={
                <Button variant="outline" size="lg" className="rounded-full">
                  <Share className="h-5 w-5" />
                  Share
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Tracks */}
      <section className="space-y-1">
        {sortedTracks.length > 0 ? (
          sortedTracks.map((track, index) => (
            <div key={track.id} className="flex items-center gap-2">
              <span className="hidden w-8 shrink-0 text-center text-sm text-muted-foreground sm:block">
                {track.trackNumber || index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <TrackListItem
                  track={track}
                  isCurrentTrack={isCurrentTrack(track.id)}
                  isPlaying={isCurrentTrack(track.id) && isPlaying}
                  onPlay={() =>
                    playTrack(track, album.tracks, {
                      type: "album",
                      id: album.id,
                      name: album.title,
                    })
                  }
                  showAlbum={false}
                  showAddButton={true}
                  className="bg-transparent hover:bg-white/5"
                />
              </div>
            </div>
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
