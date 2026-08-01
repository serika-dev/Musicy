"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ExternalLink,
  Heart,
  Music,
  Pause,
  Play,
  Share,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArtistImage } from "@/components/artist-image";
import { ShareMenu } from "@/components/share-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useArtist } from "@/hooks/useArtists";
import { cn } from "@/lib/utils";

export default function CollabPage() {
  const params = useParams();
  const artistId = params.id as string;

  const queryClient = useQueryClient();
  const { data: artist, isLoading, error } = useArtist(artistId);
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } =
    useMusicPlayer();

  // Follow/unfollow all member artists at once
  const [isFollowingAll, setIsFollowingAll] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleFollowAll = async () => {
    if (!artist?.collaborationArtists?.length) return;
    setIsFollowLoading(true);
    try {
      const method = isFollowingAll ? "DELETE" : "POST";
      await Promise.all(
        artist.collaborationArtists.map((member) =>
          fetch(`/api/artists/${member.id}/follow`, { method })
        )
      );
      setIsFollowingAll(!isFollowingAll);
      // Invalidate member artist queries
      artist.collaborationArtists.forEach((member) => {
        queryClient.invalidateQueries({ queryKey: ["artist", member.id] });
      });
    } catch (e) {
      console.error("Failed to toggle follow:", e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-[40vh] w-full animate-pulse rounded-3xl bg-muted lg:h-[45vh]" />
        <TrackListSkeleton count={8} />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <EmptyState
        icon={<Music />}
        title="Collaboration not found"
        description="This collaboration doesn't exist or is not available."
        action={<Button onClick={() => window.history.back()}>Go back</Button>}
      />
    );
  }

  const topTracks = (artist.tracks || []).slice(0, 5);
  const topAlbums = (artist.albums || []).slice(0, 5);
  const hasMoreTracks = (artist._count.tracks || 0) > 5;
  const hasMoreAlbums = (artist._count.albums || 0) > 5;

  const handlePlayAll = () => {
    if (topTracks.length > 0) {
      playTrack(topTracks[0], topTracks, {
        type: "standalone",
        name: `${artist.name} - Top Tracks`,
      });
    }
  };

  return (
    <div className="relative flex flex-col space-y-6">
      {/* Header */}
      <div className="relative flex items-end w-full min-h-[clamp(17rem,40vh,25rem)] overflow-hidden rounded-3xl shadow-xl border border-white/5">
        <div className="absolute inset-0 bg-neutral-900" />
        {artist.imageUrl ? (
          <div className="absolute inset-0">
            <img
              src={artist.imageUrl}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
        )}

        <div className="relative w-full p-6 lg:p-12 flex flex-col items-start lg:flex-row lg:items-end lg:gap-10">
          <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden shadow-2xl border-4 border-background/20 mb-6 lg:mb-0 relative group">
            <ArtistImage
              artistId={artist.id}
              artistImageUrl={artist.imageUrl}
              artistName={artist.name}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-primary/10"
            />
          </div>

          <div className="space-y-4 lg:pb-4 flex-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary border-none font-black text-[10px] py-0 px-2 uppercase"
                >
                  Collaboration
                </Badge>
                {artist.verified && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/20 text-primary border-none font-black text-[10px] py-0 px-2 uppercase"
                  >
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-[1.05] drop-shadow-xl line-clamp-2 break-words">
                {artist.name}
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm font-bold text-foreground/80">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                {artist._count.followers.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <Music className="h-4 w-4 text-primary" />
                {artist._count.tracks}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-20 left-4 z-20 rounded-full bg-black/20 backdrop-blur-md border border-white/10 lg:hidden"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* Action Bar */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl lg:static lg:mx-0 lg:border-none lg:bg-transparent lg:px-0">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4 lg:gap-6">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={topTracks.length === 0}
              className="rounded-full w-14 h-14 lg:w-auto lg:h-14 lg:px-8 group shadow-2xl"
            >
              {currentTrack && topTracks.some((t) => t.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-6 w-6 lg:mr-2 fill-current" />
              ) : (
                <Play className="h-6 w-6 lg:mr-2 fill-current" />
              )}
              <span className="hidden lg:inline font-bold">Play</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={cn(
                "w-12 h-12 lg:w-auto lg:h-12 lg:px-6 rounded-full border-white/10 transition-all",
                isFollowingAll
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "hover:bg-white/5",
              )}
              onClick={handleFollowAll}
              disabled={isFollowLoading || !artist.collaborationArtists?.length}
            >
              <Heart className={cn("h-5 w-5 lg:mr-2", isFollowingAll && "fill-current")} />
              <span className="hidden lg:inline font-bold">
                {isFollowingAll ? "Following All" : "Follow All"}
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <ShareMenu
              title={artist.name}
              url={`/collabs/${artist.id}`}
              id={artist.id}
              type="artist"
              trigger={
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full">
                  <Share className="h-5 w-5" />
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="py-4">
        <div className="grid grid-cols-1 gap-12 xl:grid-cols-3">
          {/* Tracks + Bio */}
          <div className="xl:col-span-2 space-y-6">
            {/* Member Artists */}
            {artist.collaborationArtists && artist.collaborationArtists.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-black tracking-tight">Member Artists</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {artist.collaborationArtists.map((member) => (
                    <Link
                      key={member.id}
                      href={`/artists/${member.id}`}
                      className="group flex items-center gap-3 p-3 pr-5 rounded-2xl bg-card/20 border border-white/5 hover:bg-card/40 hover:border-primary/20 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {member.imageUrl ? (
                          <img
                            src={member.imageUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                            <User className="h-5 w-5 text-primary/60" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm group-hover:text-primary transition-colors">
                          {member.name}
                        </span>
                        {member.verified && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/20 text-primary border-none font-black text-[8px] py-0 px-1.5 uppercase"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Tracks - Top 5 */}
            {topTracks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-black tracking-tight">Popular</h2>
                  {hasMoreTracks && (
                    <Link
                      href={`/artists/${artist.id}/tracks`}
                      className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      Show all {artist._count.tracks}
                    </Link>
                  )}
                </div>
                <div className="space-y-1">
                  {topTracks.map((track, index) => (
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
                            playTrack(track, topTracks, {
                              type: "standalone",
                              name: `${artist.name} - Top Tracks`,
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
            )}

            {/* Bio */}
            {artist.bio && (
              <div className="mt-8 p-6 lg:p-8 bg-card/20 rounded-2xl border border-white/5">
                <h3 className="text-lg font-black tracking-tight mb-3">About {artist.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                  {artist.bio}
                </p>
              </div>
            )}
          </div>

          {/* Albums */}
          <div className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black tracking-tight">Albums</h2>
                {hasMoreAlbums && (
                  <Link
                    href={`/artists/${artist.id}/albums`}
                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    Show all {artist._count.albums}
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {topAlbums.map((album) => (
                  <Link key={album.id} href={`/albums/${album.id}`} className="group">
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
                          • {album.albumType}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
