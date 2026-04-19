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
    // Pick the first album that has a cover for the spotlight
    const spotlightAlbum = albumsData?.albums?.find(a => a.coverImageUrl) || albumsData?.albums?.[0];

    return (
      <div className="space-y-12 pb-12">
        {/* Hero Spotlight */}
        {spotlightAlbum && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-1000">
            <AlbumSpotlight album={spotlightAlbum} />
          </section>
        )}

        {/* Quick Access & Greeting */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black tracking-tight">{greeting}</h1>
          </div>
          <QuickAccess />
        </section>

        {/* Discovery Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Main Discovery Columns (2/3) */}
          <div className="xl:col-span-2 space-y-12">
            {/* Made For You */}
            <section className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Made For You</h2>
                <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground font-semibold" asChild>
                  <Link href="/playlists">Show all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-8">
                <FeaturedPlaylists />
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold px-1">Your Daily Mixes</h3>
                    <p className="text-muted-foreground text-xs font-medium px-1">Personalized collections based on your listening history</p>
                  </div>
                  <DailyMixes />
                </div>
              </div>
            </section>

            {/* Albums */}
            <section className="space-y-6">
              <div className="flex items-center justify-between font-bold">
                <h2 className="text-2xl tracking-tight">Top Albums</h2>
                <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground font-semibold" asChild>
                  <Link href="/albums">Show all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {albumsData?.albums?.slice(0, 4).map((album) => (
                  <Link key={album.id} href={`/albums/${album.id}`} className="group relative">
                    <div className="bg-card/30 hover:bg-card/60 p-4 rounded-xl transition-all border border-border/10">
                      <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-4 relative shadow-md">
                        {album.coverImageUrl ? (
                          <img src={album.coverImageUrl} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                            <Music2 className="w-10 h-10 text-muted-foreground" />
                          </div>
                        )}
                        <Button 
                          size="icon" 
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all rounded-full bg-primary shadow-xl hover:scale-105 active:scale-95"
                          onClick={(e) => handlePlayAlbum(e, album.id)}
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm truncate">{album.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{album.artist.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Side Column (1/3) - Recently Added and Artists */}
          <div className="space-y-12">
            <section className="bg-card/20 rounded-2xl p-6 border border-border/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Recently Added</h2>
                <Button variant="link" size="sm" className="text-muted-foreground font-semibold" asChild>
                  <Link href="/tracks">View all</Link>
                </Button>
              </div>
              <RecentlyAdded />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Top Artists</h2>
                <Button variant="link" size="sm" className="text-muted-foreground font-semibold" asChild>
                  <Link href="/artists">all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {artistsData?.artists?.slice(0, 4).map((artist) => (
                  <Link key={artist.id} href={`/artists/${artist.id}`} className="group flex flex-col items-center">
                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mb-3 ring-2 ring-transparent group-hover:ring-primary/40 transition-all duration-300">
                      <ArtistImage
                        artistId={artist.id}
                        artistImageUrl={artist.imageUrl}
                        artistName={artist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-secondary"
                      />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-xs font-bold truncate px-1">{artist.name}</p>
                      <p className="text-[10px] text-muted-foreground">Artist</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
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
