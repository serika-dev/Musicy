"use client";

import { Heart, Play, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useLikedSongs } from "@/hooks/useLikedSongs";

export default function LikedSongsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: likedSongsData, isLoading, error } = useLikedSongs(50, 0);
  const { playTrack, isPlaying, isCurrentTrack } = useMusicPlayer();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="h-48 w-48 shrink-0 animate-pulse rounded-2xl bg-muted sm:h-56 sm:w-56" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-12 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <TrackListSkeleton count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Heart />}
        title="Couldn't load liked songs"
        description="Something went wrong. Please try again."
      />
    );
  }

  if (!session) {
    return null;
  }

  const tracks = likedSongsData?.tracks || [];

  const handlePlay = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks, { type: "standalone", name: "Liked Songs" });
    }
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled, {
      type: "standalone",
      name: "Liked Songs",
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-indigo-700 shadow-2xl shadow-primary/30 sm:h-56 sm:w-56">
          <Heart className="h-20 w-20 fill-current text-white sm:h-24 sm:w-24" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Playlist
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
            Liked Songs
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <span className="font-semibold text-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <span>•</span>
            <span>
              {tracks.length} {tracks.length === 1 ? "song" : "songs"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {tracks.length > 0 && (
        <div className="flex items-center gap-4">
          <Button
            size="icon-lg"
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            onClick={handlePlay}
          >
            <Play className="ml-1 h-6 w-6 fill-current" />
          </Button>
          <Button variant="ghost" size="lg" onClick={handleShuffle}>
            <Shuffle className="h-5 w-5" />
            Shuffle
          </Button>
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 ? (
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center gap-2 rounded-lg transition-colors hover:bg-white/5"
            >
              <span className="hidden w-8 shrink-0 text-center text-sm text-muted-foreground sm:block">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <TrackListItem
                  track={track}
                  isPlaying={isPlaying}
                  isCurrentTrack={isCurrentTrack(track.id)}
                  onPlay={() =>
                    playTrack(track, tracks, {
                      type: "standalone",
                      name: "Liked Songs",
                    })
                  }
                  showAlbum={true}
                  showAddButton={true}
                  className="bg-transparent hover:bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart />}
          title="No liked songs yet"
          description="Songs you like will appear here. Start exploring and heart your favorites!"
          action={
            <Button asChild className="rounded-xl">
              <a href="/artists">Browse music</a>
            </Button>
          }
        />
      )}
    </div>
  );
}
