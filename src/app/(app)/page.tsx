"use client";

import { Headphones, ListMusic, Music2, Play, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AlbumSpotlight } from "@/components/album-spotlight";
import { ArtistImage } from "@/components/artist-image";
import { DailyMixes } from "@/components/daily-mixes";
import { FeaturedPlaylists } from "@/components/featured-playlists";
import { QuickAccess } from "@/components/quick-access";
import { Carousel, CarouselSlide } from "@/components/shared/carousel";
import { MediaCard } from "@/components/shared/media-card";
import { SectionHeader } from "@/components/shared/section-header";
import { NewReleasesCards } from "@/components/new-releases-cards";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useFollowedArtists } from "@/hooks/useFollowedArtists";
import { useUserFeed } from "@/hooks/useUserFeed";

export default function Home() {
  const { data: session } = useSession();
  const [greeting, setGreeting] = useState("");
  const { data: feedData } = useUserFeed();
  const { data: followedArtistsData } = useFollowedArtists(12, 0);
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const name = session?.user?.name?.split(" ")[0] || "there";
      let baseGreeting = "Good afternoon";

      if (hour < 5) baseGreeting = "Good night";
      else if (hour < 12) baseGreeting = "Good morning";
      else if (hour < 18) baseGreeting = "Good afternoon";
      else baseGreeting = "Good evening";

      setGreeting(`${baseGreeting}, ${name}`);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session]);

  const handlePlayAlbum = (e: React.MouseEvent, albumId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // This is a shortcut. A proper implementation would fetch the album tracks first.
    // However, since we're already on the homepage, we can use a redirect or
    // better yet, trigger a fetch and play.
    fetch(`/api/albums/${albumId}`)
      .then((r) => r.json())
      .then((album) => {
        if (album.tracks && album.tracks.length > 0) {
          playTrack(album.tracks[0], album.tracks, {
            type: "album",
            id: album.id,
            name: album.title,
          });
        }
      });
  };

  if (session) {
    // The spotlight draws from catalogue-wide new releases (not just followed
    // artists), capped at one album per artist so a prolific artist's bulk
    // uploads don't own the whole banner. Falls back to followed albums.
    const spotlightAlbums = (() => {
      const pool = (feedData?.newReleases ?? []).filter((a) => a.coverImageUrl);
      const perArtist = new Map<string, number>();
      const picked: typeof pool = [];
      for (const album of pool) {
        const artistId = album.artist?.id ?? "none";
        const used = perArtist.get(artistId) ?? 0;
        if (used >= 1) continue;
        perArtist.set(artistId, used + 1);
        picked.push(album);
        if (picked.length >= 12) break;
      }
      if (picked.length < 3) {
        const followed = (feedData?.followedAlbums ?? []).filter(
          (a) => a.coverImageUrl
        );
        const perFollowedArtist = new Map<string, number>();
        for (const album of followed) {
          if (picked.length >= 6) break;
          const artistId = album.artist?.id ?? "none";
          if (perFollowedArtist.has(artistId)) continue;
          perFollowedArtist.set(artistId, 1);
          picked.push(album);
        }
      }
      return picked;
    })();

    const spotlightAlbum = spotlightAlbums[0];

    const followedArtists = followedArtistsData?.artists || [];
    const recentlyPlayed = feedData?.recentlyPlayed || [];
    const topArtists = feedData?.topArtists || [];
    const recommendedArtists = feedData?.recommendedArtists || [];

    return (
      <div className="space-y-8 pb-6 md:space-y-10">
        {/* Featured Hero Spotlight - Full Bleed Top Banner */}
        {(spotlightAlbum || (feedData?.followedAlbums && feedData.followedAlbums.length > 0)) && (
          <section className="animate-in fade-in duration-700 -mx-3 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6 mb-8">
            <AlbumSpotlight
              album={spotlightAlbum as any}
              albums={spotlightAlbums as any}
            />
          </section>
        )}

        {/* Greeting + Quick Access Grid */}
        <section className="space-y-6 pt-2 lg:pt-0">
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter animate-in fade-in slide-in-from-left duration-700">
            {greeting.split(",")[0]}
            <span className="text-primary">.</span>
            <br />
            <span className="text-muted-foreground/80 text-2xl lg:text-4xl">
              {greeting.split(",")[1]}
            </span>
          </h1>
          <QuickAccess />
        </section>

        {/* Jump Back In - Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Jump Back In" subtitle="Pick up where you left off" />
            {recentlyPlayed.length === 1 ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-card via-card/90 to-background p-4 sm:p-5 flex items-center justify-between gap-4 group shadow-xl hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                    <img
                      src={recentlyPlayed[0].album?.coverImageUrl || recentlyPlayed[0].coverImageUrl || "/placeholder-album.png"}
                      alt={recentlyPlayed[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(recentlyPlayed[0]); }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-8 h-8 fill-white text-white" />
                    </button>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Last Played</span>
                    <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                      {recentlyPlayed[0].title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {recentlyPlayed[0].artist?.name}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="rounded-full px-6 h-11 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 shrink-0 hover:scale-105 active:scale-95 transition-all"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(recentlyPlayed[0]); }}
                >
                  <Play className="mr-2 h-4 w-4 fill-current shrink-0" />
                  Resume
                </Button>
              </div>
            ) : (
              <Carousel>
                {recentlyPlayed.slice(0, 12).map((track) => (
                  <CarouselSlide key={track.id}>
                    <MediaCard
                      href={`/tracks/${track.id}`}
                      title={track.title}
                      subtitle={track.artist?.name}
                      subtitleHref={track.artist ? `/artists/${track.artist.id}` : undefined}
                      imageUrl={track.album?.coverImageUrl || track.coverImageUrl}
                      onPlay={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(track); }}
                    />
                  </CarouselSlide>
                ))}
              </Carousel>
            )}
          </section>
        )}

        {/* New from Followed Artists */}
        {feedData && feedData.followedAlbums.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader
              title="New from Artists You Follow"
              href="/albums"
            />
            <Carousel>
              {feedData.followedAlbums.slice(0, 12).map((album) => (
                <CarouselSlide key={album.id}>
                  <MediaCard
                    href={`/albums/${album.id}`}
                    title={album.title}
                    subtitle={album.artist.name}
                    subtitleHref={`/artists/${album.artist.id}`}
                    imageUrl={album.coverImageUrl}
                    badge={
                      album.albumType === "SINGLE"
                        ? "Single"
                        : album.albumType === "EP"
                          ? "EP"
                          : "Album"
                    }
                    onPlay={(e) => handlePlayAlbum(e, album.id)}
                  />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Recommended for You - Card carousel */}
        {feedData && feedData.recommendedTracks.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">
                Recommended for You
              </h2>
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground font-semibold"
                asChild
              >
                <Link href="/tracks">View all</Link>
              </Button>
            </div>
            <Carousel>
              {feedData.recommendedTracks.slice(0, 12).map((track) => (
                <CarouselSlide key={track.id}>
                  <MediaCard
                    href={`/tracks/${track.id}`}
                    title={track.title}
                    subtitle={track.artist?.name}
                    subtitleHref={track.artist ? `/artists/${track.artist.id}` : undefined}
                    imageUrl={track.album?.coverImageUrl || track.coverImageUrl}
                    onPlay={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(track); }}
                  />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Daily Mixes */}
        <section className="space-y-4 md:space-y-6">
          <SectionHeader title="Your Daily Mixes" href="/daily-mixes" />
          <DailyMixes />
        </section>

        {/* Your Top Artists */}
        {topArtists.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Your Top Artists" href="/artists" />
            <Carousel>
              {topArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <Link
                    href={`/artists/${artist.id}`}
                    className="group flex flex-col items-center"
                  >
                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mb-2 ring-1 ring-border/10 group-active:scale-95 transition-transform duration-300">
                      <ArtistImage
                        artistId={artist.id}
                        artistImageUrl={artist.imageUrl}
                        artistName={artist.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-secondary/30"
                      />
                    </div>
                    <p className="text-xs sm:text-sm font-bold truncate w-full text-center">
                      {artist.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {artist._count.tracks} tracks
                    </p>
                  </Link>
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Artists We Think You'll Like */}
        {recommendedArtists.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Artists We Think You'll Like" href="/artists" />
            <Carousel>
              {recommendedArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <Link
                    href={`/artists/${artist.id}`}
                    className="group flex flex-col items-center"
                  >
                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mb-2 ring-1 ring-border/10 group-active:scale-95 transition-transform duration-300">
                      <ArtistImage
                        artistId={artist.id}
                        artistImageUrl={artist.imageUrl}
                        artistName={artist.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-secondary/30"
                      />
                    </div>
                    <p className="text-xs sm:text-sm font-bold truncate w-full text-center">
                      {artist.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {artist._count.tracks} tracks
                    </p>
                  </Link>
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Discover Albums (matching liked genres) */}
        {feedData && feedData.discoverAlbums.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader
              title="More to Explore"
              subtitle="Based on your listening taste"
              href="/albums"
            />
            <Carousel>
              {feedData.discoverAlbums.slice(0, 12).map((album) => (
                <CarouselSlide key={album.id}>
                  <MediaCard
                    href={`/albums/${album.id}`}
                    title={album.title}
                    subtitle={album.artist.name}
                    subtitleHref={`/artists/${album.artist.id}`}
                    imageUrl={album.coverImageUrl}
                    badge="Album"
                    onPlay={(e) => handlePlayAlbum(e, album.id)}
                  />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Followed Artists */}
        {followedArtists.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Artists You Follow" href="/artists" />
            <Carousel>
              {followedArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <Link
                    href={`/artists/${artist.id}`}
                    className="group flex flex-col items-center"
                  >
                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mb-2 ring-1 ring-border/10 group-active:scale-95 transition-transform duration-300">
                      <ArtistImage
                        artistId={artist.id}
                        artistImageUrl={artist.imageUrl}
                        artistName={artist.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-secondary/30"
                      />
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold truncate w-full text-center">
                      {artist.name}
                    </p>
                  </Link>
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Community Playlists */}
        <section className="space-y-4 md:space-y-6">
          <SectionHeader title="Community Playlists" href="/playlists" />
          <FeaturedPlaylists />
        </section>

        {/* New Releases - Card carousel */}
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">New Releases</h2>
            </div>
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground font-semibold"
              asChild
            >
              <Link href="/tracks">View all</Link>
            </Button>
          </div>
          <NewReleasesCards />
        </section>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/15 via-background to-background p-8 md:p-14 lg:p-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-primary/10 backdrop-blur-md">
            <Headphones className="w-4 h-4" />
            24-Bit FLAC Lossless Audio
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] drop-shadow-md">
            Music the way it was{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              meant to be heard
            </span>
          </h1>
          <p className="text-muted-foreground text-base md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Experience uncompressed studio fidelity. Build custom playlists, sync across devices, and discover underground tracks.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Button
              size="lg"
              className="rounded-full px-9 h-13 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all hover:scale-105"
              asChild
            >
              <Link href="/login">
                <Play className="mr-2.5 h-5 w-5 fill-current" />
                Start Listening
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-13 text-base font-bold bg-white/5 hover:bg-white/10 border-white/15 backdrop-blur-xl text-white transition-all hover:scale-105"
              asChild
            >
              <Link href="/register">Create Free Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/50 border border-border/50 rounded-md p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
            <Headphones className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Lossless Audio</h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Experience your library in full FLAC fidelity. No compression, just
            pure sound.
          </p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-md p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
            <ListMusic className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Smart Playlists</h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Organize your music with intelligent automated mixes and
            collections.
          </p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-md p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
            <Music2 className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Full PWA Support</h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Install Musicy on your mobile device for a native app experience
            with offline support.
          </p>
        </div>
      </section>
    </div>
  );
}
