"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Play, Heart, Clock, Shuffle, Music2, Headphones, ListMusic } from "lucide-react";
import { FeaturedPlaylists } from "@/components/featured-playlists";
import { RecentlyAdded } from "@/components/recently-added";
import { useEffect, useState } from "react";
import { useArtists } from "@/hooks/useArtists";
import { useAlbums } from "@/hooks/useAlbums";
import { DailyMixes } from "@/components/daily-mixes";
import { ArtistImage } from "@/components/artist-image";

export default function Home() {
  const { data: session } = useSession();
  const [greeting, setGreeting] = useState("");
  const { data: artistsData } = useArtists(undefined, 6, 0);
  const { data: albumsData } = useAlbums(undefined, 6, 0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  if (session) {
    return (
      <div className="space-y-10 pb-8">
        {/* Greeting */}
        <section>
          <h1 className="text-3xl font-bold mb-6">{greeting}</h1>

          {/* Quick Access */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/liked-songs" className="group">
              <div className="flex items-center gap-3 bg-card/60 hover:bg-card rounded-md p-3 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/80 to-primary rounded flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-sm truncate">Liked Songs</span>
                <Button size="icon" variant="ghost" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </Link>

            <div className="group">
              <div className="flex items-center gap-3 bg-card/60 hover:bg-card rounded-md p-3 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-sm truncate">Recently Played</span>
                <Button size="icon" variant="ghost" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="group">
              <div className="flex items-center gap-3 bg-card/60 hover:bg-card rounded-md p-3 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center flex-shrink-0">
                  <Shuffle className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-sm truncate">Discover Weekly</span>
                <Button size="icon" variant="ghost" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Added */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recently Added</h2>
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/tracks">Show all</Link>
            </Button>
          </div>
          <RecentlyAdded />
        </section>

        {/* Made For You (Playlists & Mixes) */}
        <section className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Made For You</h2>
              <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
                <Link href="/playlists">Show all</Link>
              </Button>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <FeaturedPlaylists />
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold">Your Daily Mixes</h3>
                  <p className="text-muted-foreground text-xs font-medium">Personalized collections based on your listening history</p>
                </div>
                <DailyMixes />
              </div>
            </div>
          </div>
        </section>


        {/* Artists */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Artists</h2>
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/artists">Show all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {artistsData?.artists && artistsData.artists.length > 0 ? (
              artistsData.artists.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="group">
                  <div className="bg-card/40 hover:bg-card p-4 rounded-md transition-colors text-center space-y-3">
                    <div className="w-full aspect-square rounded-full mx-auto overflow-hidden bg-muted">
                      <ArtistImage
                        artistId={artist.id}
                        artistImageUrl={artist.imageUrl}
                        artistName={artist.name}
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/50"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm truncate">
                        {artist.name}
                        {artist.verified && <span className="ml-1 text-primary text-xs">✓</span>}
                      </h3>
                      <p className="text-xs text-muted-foreground">Artist</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card/40 p-4 rounded-md text-center space-y-3">
                  <div className="w-full aspect-square rounded-full mx-auto bg-muted flex items-center justify-center">
                    <Music2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm truncate text-muted-foreground">No Artists Yet</h3>
                    <p className="text-xs text-muted-foreground">Upload music</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Albums */}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Albums</h2>
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/albums">Show all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {albumsData?.albums && albumsData.albums.length > 0 ? (
              albumsData.albums.filter(album => album?.id && album?.title).map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`} className="group">
                  <div className="bg-card/40 hover:bg-card p-4 rounded-md transition-colors space-y-3">
                    <div className="w-full aspect-square rounded bg-muted overflow-hidden">
                      {album.coverImageUrl ? (
                        <img src={album.coverImageUrl} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                          <Music2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm truncate">{album.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {album.artist?.name || 'Unknown Artist'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card/40 p-4 rounded-md space-y-3">
                  <div className="w-full aspect-square rounded bg-muted flex items-center justify-center">
                    <Music2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm truncate text-muted-foreground">No Albums Yet</h3>
                    <p className="text-xs text-muted-foreground">Upload music</p>
                  </div>
                </div>
              ))
            )}
          </div>
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
      </section>      {/* Features */}
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
