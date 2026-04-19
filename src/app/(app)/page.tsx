"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useArtists } from "@/hooks/useArtists";
import { useAlbums } from "@/hooks/useAlbums";
import { AlbumSpotlight } from "@/components/album-spotlight";
import { QuickAccess } from "@/components/quick-access";
import { FeaturedPlaylists } from "@/components/featured-playlists";
import { RecentlyAdded } from "@/components/recently-added";
import { DailyMixes } from "@/components/daily-mixes";
import { ArtistImage } from "@/components/artist-image";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { Music2, Headphones, ListMusic, Play } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const [greeting, setGreeting] = useState("");
  const { data: artistsData } = useArtists(undefined, 6, 0);
  const { data: albumsData } = useAlbums(undefined, 6, 0);
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
      .then(r => r.json())
      .then(album => {
        if (album.tracks && album.tracks.length > 0) {
          playTrack(album.tracks[0], album.tracks, { type: 'album', id: album.id, name: album.title });
        }
      });
  };

  if (session) {
    const spotlightAlbum = albumsData?.albums?.find(a => a.coverImageUrl) || albumsData?.albums?.[0];

    return (
      <div className="space-y-10 pb-20">
        {/* Immersive Greeting */}
        <section className="pt-4 lg:pt-0">
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter animate-in fade-in slide-in-from-left duration-1000">
            {greeting.split(',')[0]}<span className="text-primary">.</span>
            <br />
            <span className="text-muted-foreground/80 text-2xl lg:text-4xl">{greeting.split(',')[1]}</span>
          </h1>
        </section>

        {/* Hero Spotlight */}
        {spotlightAlbum && (
          <section className="animate-in fade-in zoom-in-95 duration-1000 -mx-4 lg:mx-0">
            <AlbumSpotlight album={spotlightAlbum} />
          </section>
        )}

        {/* Quick Access */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight px-1">Jump Back In</h2>
          <QuickAccess />
        </section>

        {/* Discover - Horizontal Scroll on Mobile */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold tracking-tight">Discover</h2>
          </div>
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold px-1">Your Daily Mixes</h3>
              <DailyMixes />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold px-1">Community Playlists</h3>
              <FeaturedPlaylists />
            </div>
          </div>
        </section>

        {/* Top Albums */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold tracking-tight">Top Albums</h2>
            <Button variant="link" size="sm" className="text-muted-foreground font-semibold" asChild>
              <Link href="/albums">See all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {albumsData?.albums?.map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`} className="group cursor-pointer">
                <div className="space-y-3">
                  <div className="relative aspect-square bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden rounded-md shadow-md">
                    {album.coverImageUrl ? (
                      <img src={album.coverImageUrl} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <Button size="icon" className="rounded-full w-10 h-10 shadow-lg bg-primary text-primary-foreground" onClick={(e) => handlePlayAlbum(e, album.id)}>
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </Button>
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="font-bold text-sm leading-tight truncate">{album.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium">{album.artist.name}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-70">Album</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Artists - Circular Horizontal Scroll */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold tracking-tight">Favorite Artists</h2>
            <Button variant="link" size="sm" className="text-muted-foreground font-semibold" asChild>
              <Link href="/artists">See all</Link>
            </Button>
          </div>
          <div className="flex lg:grid lg:grid-cols-6 gap-6 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar lg:mx-0 lg:px-0">
            {artistsData?.artists?.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.id}`} className="group flex flex-col items-center flex-shrink-0 w-24 lg:w-auto">
                <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mb-3 ring-1 ring-border/10 group-active:scale-95 transition-transform duration-300">
                  <ArtistImage
                    artistId={artist.id}
                    artistImageUrl={artist.imageUrl}
                    artistName={artist.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    fallbackClassName="w-full h-full flex items-center justify-center bg-secondary/30"
                  />
                </div>
                <p className="text-[11px] font-bold truncate w-full text-center">{artist.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick List Section */}
        <section className="bg-gradient-to-b from-card/30 to-card/10 rounded-3xl p-6 border border-border/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">New Releases</h2>
            <Button variant="link" size="sm" className="text-muted-foreground font-semibold" asChild>
              <Link href="/tracks">View all</Link>
            </Button>
          </div>
          <RecentlyAdded />
        </section>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="relative text-center py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-lg" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Headphones className="w-4 h-4" />
            Lossless Streaming
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            Music the way it was{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              meant to be heard
            </span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl mx-auto">
            Stream in FLAC quality. Create playlists. Discover new artists. 
            Part of the Serika ecosystem.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/login">
                <Play className="mr-2 h-5 w-5" />
                Start Listening
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/register">Create Account</Link>
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
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">Experience your library in full FLAC fidelity. No compression, just pure sound.</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-md p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
            <ListMusic className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Smart Playlists</h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">Organize your music with intelligent automated mixes and collections.</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-md p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
            <Music2 className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Full PWA Support</h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">Install Musicy on your mobile device for a native app experience with offline support.</p>
        </div>
      </section>
    </div>
  );
}
