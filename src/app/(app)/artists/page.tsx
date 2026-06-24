"use client";

import { useQuery } from "@tanstack/react-query";
import { Mic2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ArtistImage } from "@/components/artist-image";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaCard } from "@/components/shared/media-card";
import { PageHeader } from "@/components/shared/page-header";
import { MediaGridSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Artist {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  verified: boolean;
  _count: {
    tracks: number;
    albums: number;
    followers: number;
  };
}

interface ArtistsResponse {
  artists: Artist[];
  total: number;
  limit: number;
  offset: number;
}

function useArtists(search: string, limit = 24, offset = 0) {
  return useQuery({
    queryKey: ["artists", search, limit, offset],
    queryFn: async (): Promise<ArtistsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/artists?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artists");
      }
      return response.json();
    },
  });
}

export default function ArtistsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 24;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useArtists(
    debouncedSearch,
    limit,
    page * limit,
  );

  const hasMore = data ? (page + 1) * limit < data.total : false;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Mic2 />}
        title="Artists"
        description="Discover talented artists and their music"
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-secondary/30"
            />
          </div>
        }
      />

      {isLoading && page === 0 ? (
        <MediaGridSkeleton count={12} rounded />
      ) : error ? (
        <EmptyState
          icon={<Mic2 />}
          title="Couldn't load artists"
          description="Something went wrong. Please try again."
        />
      ) : !data?.artists.length ? (
        <EmptyState
          icon={<Mic2 />}
          title={
            debouncedSearch
              ? `No artists for "${debouncedSearch}"`
              : "No artists yet"
          }
          description="Artists will show up here once they're available."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {data.artists.map((artist) => (
              <MediaCard
                key={artist.id}
                href={`/artists/${artist.id}`}
                title={`${artist.name}${artist.verified ? " ✓" : ""}`}
                subtitle={`${artist._count.tracks} tracks`}
                rounded
                fallback={
                  <ArtistImage
                    artistId={artist.id}
                    artistImageUrl={artist.imageUrl}
                    artistName={artist.name}
                    className="h-full w-full object-cover"
                    fallbackClassName="h-full w-full flex items-center justify-center bg-secondary/30"
                  />
                }
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
            Showing {data.artists.length} of {data.total} artists
          </p>
        </>
      )}
    </div>
  );
}
