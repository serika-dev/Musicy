"use client";

import { useQuery } from "@tanstack/react-query";
import { ListMusic, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaCard } from "@/components/shared/media-card";
import { PageHeader } from "@/components/shared/page-header";
import { MediaGridSkeleton } from "@/components/shared/skeletons";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  isCollaborative: boolean;
  createdAt: string;
  owner: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  _count: {
    tracks: number;
    likes: number;
  };
}

interface PlaylistsResponse {
  playlists: Playlist[];
  total: number;
  limit: number;
  offset: number;
}

function usePlaylists(userOnly = false, search = "", limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["playlists", userOnly, search, limit, offset],
    queryFn: async (): Promise<PlaylistsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (userOnly) {
        params.append("userOnly", "true");
      }

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/playlists?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      return response.json();
    },
  });
}

export default function PlaylistsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showUserOnly, setShowUserOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = usePlaylists(
    showUserOnly,
    debouncedSearch,
    limit,
    page * limit,
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ListMusic />}
        title="Playlists"
        description="Discover curated collections of music"
        actions={
          session ? (
            <Button asChild className="rounded-xl">
              <Link href="/playlists/create">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-secondary/30"
          />
        </div>

        {session && (
          <div className="flex gap-2">
            <Button
              variant={showUserOnly ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => {
                setShowUserOnly(true);
                setPage(0);
              }}
            >
              My Playlists
            </Button>
            <Button
              variant={!showUserOnly ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => {
                setShowUserOnly(false);
                setPage(0);
              }}
            >
              All
            </Button>
          </div>
        )}
      </div>

      {isLoading && page === 0 ? (
        <MediaGridSkeleton count={12} />
      ) : error ? (
        <EmptyState
          icon={<ListMusic />}
          title="Couldn't load playlists"
          description="Something went wrong. Please try again."
        />
      ) : !data?.playlists.length ? (
        <EmptyState
          icon={<ListMusic />}
          title={
            debouncedSearch
              ? `No playlists for "${debouncedSearch}"`
              : showUserOnly
                ? "You haven't created any playlists yet"
                : "No playlists found"
          }
          description="Create a playlist to start organizing your music."
          action={
            session ? (
              <Button asChild className="rounded-xl">
                <Link href="/playlists/create">
                  <Plus className="h-4 w-4" />
                  Create your first playlist
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {data.playlists.map((playlist) => (
              <MediaCard
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                title={playlist.name}
                subtitle={`by ${playlist.owner.displayName || playlist.owner.username || "Unknown"}`}
                imageUrl={playlist.coverImageUrl}
                badge={`Playlist · ${playlist._count.tracks}`}
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-muted to-muted/60">
                    <span className="text-4xl font-bold text-white/40">
                      {playlist.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                }
              />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          <p className="text-center text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} · {data.total} playlists
          </p>
        </>
      )}
    </div>
  );
}
