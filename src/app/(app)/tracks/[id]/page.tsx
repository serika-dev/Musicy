"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Heart, Music, Pause, Play, Share } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShareMenu } from "@/components/share-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { formatDuration } from "@/lib/utils";

interface Track {
  id: string;
  title: string;
  duration: number;
  filePath: string;
  genre?: string;
  playCount: number;
  createdAt: string;
  format: string;
  bitRate?: number;
  sampleRate?: number;
  artist: {
    id: string;
    name: string;
    verified: boolean;
  };
  album?: {
    id: string;
    title: string;
    coverImageUrl?: string;
    releaseDate?: string;
  };
}

function useTrack(id: string) {
  return useQuery<Track>({
    queryKey: ["track", id],
    queryFn: async () => {
      const response = await fetch(`/api/tracks/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch track");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export default function TrackPage() {
  const params = useParams();
  const trackId = params.id as string;

  const { data: track, isLoading, error } = useTrack(trackId);
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="w-64 h-64 bg-muted rounded-2xl"></div>
          <div className="flex-1 space-y-4 w-full">
            <div className="h-10 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <EmptyState
        icon={<Music />}
        title="Track not found"
        description="This track doesn't exist or is not available."
        action={<Button onClick={() => window.history.back()}>Go back</Button>}
      />
    );
  }

  const handlePlay = () => {
    playTrack(track);
  };

  return (
    <div className="space-y-8">
      {/* Track Header */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Album Cover */}
        <div className="w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/60 rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
          {track.album?.coverImageUrl ? (
            <Image
              src={track.album.coverImageUrl}
              alt={track.album.title || "Album cover"}
              fill
              className="object-cover"
              sizes="256px"
            />
          ) : (
            <Music className="w-24 h-24 text-white/80" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">
              Track
            </Badge>
            <p className="text-4xl font-bold mb-2" aria-hidden="true">{track.title}</p>
            <div className="flex items-center space-x-2 text-lg">
              <Link
                href={`/artists/${track.artist.id}`}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {track.artist.name}
                {track.artist.verified && (
                  <span className="ml-1 text-primary">✓</span>
                )}
              </Link>
              {track.album && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    href={`/albums/${track.album.id}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {track.album.title}
                  </Link>
                  {track.album.releaseDate && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {new Date(track.album.releaseDate).getFullYear()}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(track.duration)}</span>
            </span>
            <span>{track.playCount.toLocaleString()} plays</span>
            {track.genre && <span>{track.genre}</span>}
          </div>

          {/* Technical Info */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <Badge variant="secondary">{track.format}</Badge>
            {track.bitRate && <span>{track.bitRate} kbps</span>}
            {track.sampleRate && <span>{track.sampleRate} Hz</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              onClick={handlePlay}
              className="flex items-center space-x-2"
            >
              {isCurrentTrack(track.id) && isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span>
                {isCurrentTrack(track.id) && isPlaying ? "Pause" : "Play"}
              </span>
            </Button>

            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5 mr-2" />
              Like
            </Button>

            <ShareMenu
              title={track.title}
              url={`/tracks/${track.id}`}
              id={track.id}
              type="track"
              trigger={
                <Button variant="outline" size="lg">
                  <Share className="h-5 w-5 mr-2" />
                  Share
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Track Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2">{formatDuration(track.duration)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <span className="ml-2">{track.format}</span>
                </div>
                {track.bitRate && (
                  <div>
                    <span className="text-muted-foreground">Bit Rate:</span>
                    <span className="ml-2">{track.bitRate} kbps</span>
                  </div>
                )}
                {track.sampleRate && (
                  <div>
                    <span className="text-muted-foreground">Sample Rate:</span>
                    <span className="ml-2">{track.sampleRate} Hz</span>
                  </div>
                )}
                {track.genre && (
                  <div>
                    <span className="text-muted-foreground">Genre:</span>
                    <span className="ml-2">{track.genre}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Added:</span>
                  <span className="ml-2">
                    {new Date(track.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Artist</div>
                <Link
                  href={`/artists/${track.artist.id}`}
                  className="font-medium hover:underline"
                >
                  {track.artist.name}
                  {track.artist.verified && (
                    <span className="ml-1 text-primary">✓</span>
                  )}
                </Link>
              </div>
              {track.album && (
                <div>
                  <div className="text-sm text-muted-foreground">Album</div>
                  <Link
                    href={`/albums/${track.album.id}`}
                    className="font-medium hover:underline"
                  >
                    {track.album.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
