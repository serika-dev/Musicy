"use client";

import { ChevronLeft, ChevronRight, Music, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaCard } from "@/components/shared/media-card";
import { MediaGridSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMusicPlayer } from "@/contexts/music-player-context";
import type { Track } from "@/types/track";

interface TracksResponse {
  tracks: Track[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function TracksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const genre = searchParams.get("genre");
  const { playTrack } = useMusicPlayer();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<TracksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 30;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: (page * limit).toString(),
        });
        if (search) params.set("search", search);
        if (genre) params.set("genre", genre);

        const res = await fetch(`/api/tracks?${params}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch tracks:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchTracks, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [page, search, genre]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
          {genre ? genre : "Browse Tracks"}
        </h1>
        <p className="text-muted-foreground font-medium">
          {data?.total ?? "..."} tracks{genre ? ` in ${genre}` : ""} — available
          in lossless quality.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search tracks by title or artist…"
          className="pl-12 h-12 rounded-xl bg-muted/40 border-0 focus-visible:ring-primary/20 text-base"
        />
      </div>

      {/* Track grid */}
      {isLoading ? (
        <MediaGridSkeleton count={12} />
      ) : data?.tracks?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.tracks.map((track) => (
            <MediaCard
              key={track.id}
              href={`/tracks/${track.id}`}
              title={track.title}
              subtitle={track.artist.name}
              subtitleHref={`/artists/${track.artist.id}`}
              imageUrl={track.album?.coverImageUrl || track.coverImageUrl}
              badge={track.genre}
              onPlay={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playTrack(track, data.tracks, {
                  type: "standalone",
                  id: "tracks",
                  name: genre ? genre : "Browse Tracks",
                });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Music />}
          title="No tracks found"
          description="Try a different search term."
        />
      )}

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground font-bold">
            Page {page + 1} of {Math.ceil(data.total / limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
