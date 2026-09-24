"use client";

import { AudioWaveform, Headphones, ListMusic, MonitorSmartphone, Play } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AlbumSpotlight } from "@/components/album-spotlight";
import { ArtistCard } from "@/components/shared/artist-card";
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
      <div className="space-y-9 pb-6 md:space-y-11">
        {/* Featured Hero Spotlight - Full Bleed Top Banner */}
        {(spotlightAlbum || (feedData?.followedAlbums && feedData.followedAlbums.length > 0)) && (
          <section className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
            <AlbumSpotlight
              album={spotlightAlbum as any}
              albums={spotlightAlbums as any}
            />
          </section>
        )}

        {/* Greeting + Quick Access Grid */}
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {greeting || "\u00a0"}
          </h1>
          <QuickAccess />
        </section>

        {/* Jump Back In - Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Jump back in" />
            {recentlyPlayed.length === 1 ? (
              <div className="group flex items-center justify-between gap-4 rounded-lg bg-foreground/[0.06] p-3 transition-colors hover:bg-foreground/[0.1] sm:p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md shadow-lg shadow-black/40 sm:h-20 sm:w-20">
                    <img
                      src={recentlyPlayed[0].album?.coverImageUrl || recentlyPlayed[0].coverImageUrl || "/placeholder-album.png"}
                      alt={recentlyPlayed[0].title}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); playTrack(recentlyPlayed[0]); }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-8 h-8 fill-white text-white" />
                    </button>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Last played</span>
                    <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                      {recentlyPlayed[0].title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {recentlyPlayed[0].artist?.name}
                    </p>
                  </div>
                </div>
                <Button
                  className="h-10 shrink-0 rounded-full px-5 font-semibold hover:scale-105 hover:bg-primary"
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
              title="New from artists you follow"
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
            <SectionHeader title="Made for you" subtitle="Songs we think you'll love" href="/tracks" />
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
          <SectionHeader title="Your daily mixes" href="/daily-mixes" />
          <DailyMixes />
        </section>

        {/* Your Top Artists */}
        {topArtists.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Your top artists" href="/artists" />
            <Carousel>
              {topArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <ArtistCard id={artist.id} name={artist.name} imageUrl={artist.imageUrl} subtitle={`${artist._count.tracks} tracks`} />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Artists We Think You'll Like */}
        {recommendedArtists.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader title="Artists you might like" href="/artists" />
            <Carousel>
              {recommendedArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <ArtistCard id={artist.id} name={artist.name} imageUrl={artist.imageUrl} subtitle={`${artist._count.tracks} tracks`} />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Discover Albums (matching liked genres) */}
        {feedData && feedData.discoverAlbums.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <SectionHeader
              title="More to explore"
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
            <SectionHeader title="Artists you follow" href="/artists" />
            <Carousel>
              {followedArtists.map((artist) => (
                <CarouselSlide key={artist.id}>
                  <ArtistCard id={artist.id} name={artist.name} imageUrl={artist.imageUrl} />
                </CarouselSlide>
              ))}
            </Carousel>
          </section>
        )}

        {/* Community Playlists */}
        <section className="space-y-4 md:space-y-6">
          <SectionHeader title="Community playlists" href="/playlists" />
          <FeaturedPlaylists />
        </section>

        {/* New Releases - Card carousel */}
        <section className="space-y-4 md:space-y-6">
          <SectionHeader title="New releases" href="/tracks" />
          <NewReleasesCards />
        </section>
      </div>
    );
  }

  // Landing page for non-authenticated users
  const features = [
    {
      icon: AudioWaveform,
      title: "Lossless, always",
      body: "Up to 24-bit FLAC, streamed exactly as it left the studio. No compression, no compromise.",
    },
    {
      icon: ListMusic,
      title: "Mixes that know you",
      body: "Daily mixes and recommendations tuned to what you actually play, refreshed every day.",
    },
    {
      icon: MonitorSmartphone,
      title: "Every device, in sync",
      body: "Hand playback between phone, desktop and browser tabs. Download for offline listening.",
    },
  ];

  return (
    <div className="space-y-6 pb-8 md:space-y-8">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-card px-6 py-16 text-center md:px-12 md:py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,hsl(var(--primary)/0.35),transparent_70%)]"
        />
        <div className="mx-auto max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.08] px-3.5 py-1.5 text-xs font-semibold text-foreground/90">
            <Headphones className="h-3.5 w-3.5 text-primary" />
            24-bit FLAC lossless audio
          </span>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Music the way it was meant to be heard.
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg">
            Studio-quality streaming, playlists you&apos;ll actually use, and mixes that get better the more you listen.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button
              className="h-12 w-full rounded-full px-8 text-base font-bold hover:scale-105 hover:bg-primary sm:w-auto"
              asChild
            >
              <Link href="/register">
                <Play className="!size-4 fill-current" />
                Start listening — it&apos;s free
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-foreground/50 bg-transparent px-8 text-base font-bold hover:scale-105 hover:border-foreground hover:bg-transparent sm:w-auto"
              asChild
            >
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl bg-card p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
