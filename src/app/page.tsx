"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Play, Heart, Clock, Plus, Shuffle } from "lucide-react";
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
  const { data: artistsData } = useArtists(undefined, 6, 0); // Get 6 artists
  const { data: albumsData } = useAlbums(undefined, 6, 0); // Get 6 albums

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  if (session) {
  return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Greeting Section */}
            <section>
              <h1 className="text-4xl font-bold mb-8">{greeting}</h1>
              
              {/* Quick Access Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card className="group hover:bg-accent/50 transition-colors cursor-pointer" asChild>
                  <Link href="/liked-songs">
                    <CardContent className="flex items-center space-x-4 p-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded flex items-center justify-center">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Liked Songs</h3>
                        <p className="text-sm text-muted-foreground">Your favorite tracks</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                      >
                        <Play className="w-5 h-5" />
                      </Button>
                    </CardContent>
                  </Link>
                </Card>

                <Card className="group hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center space-x-4 p-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded flex items-center justify-center">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Recently Played</h3>
                      <p className="text-sm text-muted-foreground">Your recent tracks</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    >
                      <Play className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="group hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center space-x-4 p-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center">
                      <Shuffle className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Discover Weekly</h3>
                      <p className="text-sm text-muted-foreground">New music for you</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    >
                      <Play className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Recently Added */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recently Added</h2>
                <Button variant="ghost" asChild>
                  <Link href="/tracks">Show all</Link>
                </Button>
              </div>
              <RecentlyAdded />
            </section>

            {/* Featured Playlists */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Made For You</h2>
                <Button variant="ghost" asChild>
                  <Link href="/playlists">Show all</Link>
                </Button>
              </div>
              <FeaturedPlaylists />
            </section>

            {/* Artists You Might Like */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Artists You Might Like</h2>
                <Button variant="ghost" asChild>
                  <Link href="/artists">Show all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {artistsData?.artists && artistsData.artists.length > 0 ? (
                  artistsData.artists.map((artist) => (
                    <Card key={artist.id} className="group hover:bg-accent/50 transition-colors cursor-pointer" asChild>
                      <Link href={`/artists/${artist.id}`}>
                        <CardContent className="p-4 text-center space-y-3">
                          <div className="w-full aspect-square bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto overflow-hidden">
                            <ArtistImage
                              artistId={artist.id}
                              artistImageUrl={artist.imageUrl}
                              artistName={artist.name}
                              className="w-full h-full object-cover rounded-full"
                              fallbackClassName="w-full h-full flex items-center justify-center"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold truncate">
                              {artist.name}
                              {artist.verified && <span className="ml-1 text-primary">✓</span>}
                            </h3>
                            <p className="text-sm text-muted-foreground">Artist</p>
                          </div>
                          <Button
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Link>
                    </Card>
                  ))
                ) : (
                  // Fallback for when no artists are available
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="group hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4 text-center space-y-3">
                        <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-600 rounded-full mx-auto flex items-center justify-center">
                          <span className="text-white text-lg">🎵</span>
                        </div>
                        <div>
                          <h3 className="font-semibold truncate">No Artists Yet</h3>
                          <p className="text-sm text-muted-foreground">Upload some music!</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>

            {/* Daily Mixes Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Made for You</h2>
                  <p className="text-muted-foreground text-sm">Daily mixes based on your listening habits</p>
                </div>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Shuffle className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </div>
              <DailyMixes />
            </section>

            {/* Popular Albums */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Popular Albums</h2>
                <Button variant="ghost" asChild>
                  <Link href="/albums">Show all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {albumsData?.albums && albumsData.albums.length > 0 ? (
                  albumsData.albums.filter(album => album?.id && album?.title).map((album) => (
                    <Card key={album.id} className="group hover:bg-accent/50 transition-colors cursor-pointer">
                      <Link href={`/albums/${album.id}`}>
                        <CardContent className="p-4 text-center space-y-3">
                          <div className="w-full aspect-square bg-gradient-to-br from-blue-400 to-blue-600 rounded mx-auto flex items-center justify-center overflow-hidden">
                            {album.coverImageUrl ? (
                              <img
                                src={album.coverImageUrl}
                                alt={album.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-2xl font-bold">
                                {album.title.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold truncate">
                              {album.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {album.artist?.name || 'Unknown Artist'}
                              {album.artist?.verified && <span className="ml-1 text-primary">✓</span>}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Link>
                    </Card>
                  ))
                ) : (
                  // Fallback for when no albums are available
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="group hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4 text-center space-y-3">
                        <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-600 rounded mx-auto flex items-center justify-center">
                          <span className="text-white text-lg">📀</span>
                        </div>
                        <div>
                          <h3 className="font-semibold truncate">No Albums Yet</h3>
                          <p className="text-sm text-muted-foreground">Upload some music!</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-16">
          {/* Hero Section */}
          <section className="text-center py-16">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Experience Music in{" "}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Lossless Quality
                </span>
              </h1>
              <p className="text-muted-foreground text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                Stream your favorite tracks in high-quality FLAC and ALAC formats. 
                Create playlists, discover new music, and connect with fellow music lovers.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 py-4 h-auto" asChild>
                  <Link href="/login">
                    <Play className="mr-2 h-6 w-6" />
                    Start Listening
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto" asChild>
                  <Link href="/register">
                    Join Now
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <Card className="text-center p-8 border-2 hover:border-primary/20 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Lossless Audio</h3>
                <p className="text-muted-foreground">
                  Experience every detail with FLAC and high-quality audio streaming
                </p>
              </Card>

              <Card className="text-center p-8 border-2 hover:border-primary/20 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Playlists</h3>
                <p className="text-muted-foreground">
                  Create and organize your music with intelligent playlist features
                </p>
              </Card>

              <Card className="text-center p-8 border-2 hover:border-primary/20 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Shuffle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Discover Music</h3>
                <p className="text-muted-foreground">
                  Find new artists and tracks tailored to your taste
                </p>
              </Card>
            </div>
          </section>

          {/* Featured Content for Guests */}
          <section>
            <h2 className="text-3xl font-bold text-center mb-12">Discover Amazing Music</h2>
            <div className="space-y-12">
              <div>
                <h3 className="text-2xl font-semibold mb-6">Featured Playlists</h3>
                <FeaturedPlaylists />
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-6">Recently Added</h3>
                <RecentlyAdded />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
