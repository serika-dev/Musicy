"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Music } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArtistImage } from "@/components/artist-image";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useArtist } from "@/hooks/useArtists";

interface AlbumItem {
  id: string;
  title: string;
  coverImageUrl?: string;
  releaseDate?: string;
  albumType: string;
  genre?: string;
  _count: { tracks: number };
}

export default function ArtistAlbumsPage() {
  const params = useParams();
  const artistId = params.id as string;

  const { data: artist } = useArtist(artistId);

  const { data, isLoading } = useQuery<{
    albums: AlbumItem[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ["artist-albums", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/artists/${artistId}/albums?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch albums");
      return res.json();
    },
    enabled: !!artistId,
  });

  const albums = data?.albums || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-16 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!albums.length) {
    return (
      <EmptyState
        icon={<Music />}
        title="No albums found"
        description="This artist has no public albums yet."
        action={
          <Button asChild>
            <Link href={`/artists/${artistId}`}>Back to artist</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          asChild
        >
          <Link href={`/artists/${artistId}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            <ArtistImage
              artistId={artistId}
              artistImageUrl={artist?.imageUrl}
              artistName={artist?.name || "Artist"}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {artist?.name || "Artist"}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {data?.total || 0} {data?.total === 1 ? "album" : "albums"}
            </p>
          </div>
        </div>
      </div>

      {/* Album grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/albums/${album.id}`}
            className="group"
          >
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-card/20 border border-white/5 group-hover:bg-card/40 transition-all">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-muted rounded-xl flex-shrink-0 relative overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                {album.coverImageUrl ? (
                  <img
                    src={album.coverImageUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-8 w-8 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm lg:text-base truncate group-hover:text-primary transition-colors">
                  {album.title}
                </h4>
                <p className="text-[11px] lg:text-xs text-muted-foreground/80 font-medium">
                  {album.releaseDate
                    ? new Date(album.releaseDate).getFullYear()
                    : "N/A"}{" "}
                  • {album.albumType} • {album._count.tracks}{" "}
                  {album._count.tracks === 1 ? "track" : "tracks"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
