"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaCard } from "@/components/shared/media-card";
import { PageHeader } from "@/components/shared/page-header";
import { MediaGridSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMusicPlayer } from "@/contexts/music-player-context";

interface Album {
  id: string;
  title: string;
  coverImageUrl?: string;
  releaseDate?: string;
  albumType: "ALBUM" | "EP" | "SINGLE";
  genre?: string;
  artist: {
    id: string;
    name: string;
    verified: boolean;
  };
  _count: {
    tracks: number;
  };
}

interface AlbumsResponse {
  albums: Album[];
  total: number;
  limit: number;
  offset: number;
}

function useAlbums(search: string, limit = 24, offset = 0) {
  return useQuery({
    queryKey: ["albums", search, limit, offset],
    queryFn: async (): Promise<AlbumsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/albums?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }
      return response.json();
    },
  });
}

export default function AlbumsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 24;
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useAlbums(
    debouncedSearch,
    limit,
    page * limit,
  );

  const hasMore = data ? (page + 1) * limit < data.total : false;

  const handlePlayAlbum = (albumId: string, title: string) => {
    fetch(`/api/albums/${albumId}`)
      .then((r) => r.json())
      .then((album) => {
        if (album.tracks && album.tracks.length > 0) {
          playTrack(album.tracks[0], album.tracks, {
            type: "album",
            id: album.id,
            name: title,
          });
        }
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Disc3 />}
        title="Albums"
        description="Discover albums from your favorite artists"
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search albums..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-secondary/30"
            />
          </div>
        }
      />

      {isLoading && page === 0 ? (
        <MediaGridSkeleton count={12} />
      ) : error ? (
        <EmptyState
          icon={<Disc3 />}
          title="Couldn't load albums"
          description="Something went wrong. Please try again."
        />
      ) : !data?.albums.length ? (
        <EmptyState
          icon={<Disc3 />}
          title={
            debouncedSearch
              ? `No albums for "${debouncedSearch}"`
              : "No albums yet"
          }
          description="Albums will show up here once they're available."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {data.albums
              .filter((album) => album?.id && album.title)
              .map((album) => (
                <MediaCard
                  key={album.id}
                  href={`/albums/${album.id}`}
                  title={album.title}
                  subtitle={album.artist.name}
                  imageUrl={album.coverImageUrl}
                  badge={
                    album.albumType === "SINGLE"
                      ? "Single"
                      : album.albumType === "EP"
                        ? "EP"
                        : "Album"
                  }
                  onPlay={() => handlePlayAlbum(album.id, album.title)}
                />
              ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
                className="rounded-xl"
              >
                {isLoading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Showing {data.albums.length} of {data.total} albums
          </p>
        </>
      )}
    </div>
  );
}
