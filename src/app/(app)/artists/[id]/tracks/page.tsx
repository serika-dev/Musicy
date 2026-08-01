"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Music } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArtistImage } from "@/components/artist-image";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { type Artist, useArtist } from "@/hooks/useArtists";
import { Track } from "@/types/track";

export default function ArtistTracksPage() {
  const params = useParams();
  const artistId = params.id as string;

  const { data: artist } = useArtist(artistId);
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer();

  const { data, isLoading } = useQuery<{
    tracks: Track[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ["artist-tracks", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/artists/${artistId}/tracks?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
    enabled: !!artistId,
  });

  const tracks = data?.tracks || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <TrackListSkeleton count={10} />
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <EmptyState
        icon={<Music />}
        title="No tracks found"
        description="This artist has no public tracks yet."
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
              {data?.total || 0} {data?.total === 1 ? "track" : "tracks"}
            </p>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex items-center group/item hover:bg-white/5 rounded-xl transition-colors pr-2"
          >
            <div className="w-10 text-center text-xs font-bold text-muted-foreground group-hover/item:text-foreground transition-colors shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 overflow-hidden">
              <TrackListItem
                track={track}
                isCurrentTrack={isCurrentTrack(track.id)}
                isPlaying={isCurrentTrack(track.id) && isPlaying}
                onPlay={() =>
                  playTrack(track, tracks, {
                    type: "standalone",
                    name: `${artist?.name || "Artist"} - All Tracks`,
                  })
                }
                showAddButton={true}
                className="bg-transparent hover:bg-transparent border-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
