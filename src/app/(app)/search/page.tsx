"use client";

import {
  Clock,
  Headphones,
  Music,
  Play,
  Search,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaCard } from "@/components/shared/media-card";
import { TrackListSkeleton } from "@/components/shared/skeletons";
import { TrackListItem } from "@/components/track-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import type { Track } from "@/types/track";

interface SearchArtist {
  id: string;
  name: string;
  imageUrl?: string;
}

interface SearchAlbum {
  id: string;
  title: string;
  coverImageUrl?: string;
  artist?: { name: string };
}

interface SearchPlaylist {
  id: string;
  name: string;
  coverImageUrl?: string;
}

interface SearchResults {
  tracks: Track[];
  artists: SearchArtist[];
  albums: SearchAlbum[];
  playlists: SearchPlaylist[];
}

const BROWSE_CATEGORIES = [
  {
    name: "Recently Played",
    color: "from-indigo-600 to-indigo-900",
    icon: Clock,
  },
  {
    name: "Made For You",
    color: "from-emerald-600 to-emerald-900",
    icon: Music,
  },
  {
    name: "New Releases",
    color: "from-rose-600 to-rose-900",
    icon: TrendingUp,
  },
  { name: "Hip-Hop", color: "from-amber-600 to-amber-900", icon: Music },
  { name: "Pop", color: "from-purple-600 to-purple-900", icon: Music },
  { name: "Electronic", color: "from-sky-600 to-sky-900", icon: Music },
  { name: "Jazz", color: "from-orange-600 to-orange-900", icon: Music },
  { name: "Classical", color: "from-slate-600 to-slate-900", icon: Music },
  { name: "Rock", color: "from-red-600 to-red-900", icon: Music },
  { name: "Latin", color: "from-pink-600 to-pink-900", icon: Music },
  { name: "Acoustic", color: "from-teal-600 to-teal-900", icon: Music },
  { name: "Focus", color: "from-blue-600 to-blue-900", icon: Headphones },
];

function SearchPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const [tracksRes, artistsRes, albumsRes, playlistsRes] =
        await Promise.all([
          fetch(
            `/api/tracks?search=${encodeURIComponent(searchQuery)}&limit=20`,
          ),
          fetch(
            `/api/artists?search=${encodeURIComponent(searchQuery)}&limit=12`,
          ),
          fetch(
            `/api/albums?search=${encodeURIComponent(searchQuery)}&limit=12`,
          ),
          fetch(
            `/api/playlists?search=${encodeURIComponent(searchQuery)}&limit=12`,
          ),
        ]);

      const [tracksData, artistsData, albumsData, playlistsData] =
        await Promise.all([
          tracksRes.ok ? tracksRes.json() : { tracks: [] },
          artistsRes.ok ? artistsRes.json() : { artists: [] },
          albumsRes.ok ? albumsRes.json() : { albums: [] },
          playlistsRes.ok ? playlistsRes.json() : { playlists: [] },
        ]);

      setResults({
        tracks: tracksData.tracks || [],
        artists: artistsData.artists || [],
        albums: albumsData.albums || [],
        playlists: playlistsData.playlists || [],
      });
    } catch (error) {
      console.error("Search error:", error);
      setResults({ tracks: [], artists: [], albums: [], playlists: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalResults =
    results.tracks.length +
    results.artists.length +
    results.albums.length +
    results.playlists.length;

  const topTrack = results.tracks[0];
  const topArtist = results.artists[0];

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <div className="sticky top-16 z-30 -mx-4 -mt-6 bg-background/80 px-4 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:mt-0 lg:bg-transparent lg:p-0">
        <div className="mb-3 flex items-center gap-3 lg:hidden">
          <h1 className="text-2xl font-black">Search</h1>
        </div>
        <form onSubmit={handleSearch} className="relative w-full lg:max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artists, songs, albums, or playlists"
            className="h-14 rounded-xl border-0 bg-muted/40 pl-12 text-base focus-visible:ring-primary/20"
          />
        </form>
      </div>

      {/* Results */}
      {query && (
        <div className="space-y-8">
          {isLoading ? (
            <TrackListSkeleton count={8} />
          ) : totalResults > 0 ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="tracks">Songs</TabsTrigger>
                <TabsTrigger value="artists">Artists</TabsTrigger>
                <TabsTrigger value="albums">Albums</TabsTrigger>
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-8">
                {(topTrack || topArtist) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="col-span-1 border-border/40 bg-card/60 p-6 transition-colors hover:bg-card">
                      <CardContent className="p-0">
                        {topTrack ? (
                          <div className="space-y-4">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
                              {topTrack.album?.coverImageUrl ? (
                                // biome-ignore lint/performance/noImgElement: remote artwork
                                <img
                                  src={topTrack.album.coverImageUrl}
                                  alt={topTrack.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Music className="h-10 w-10 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="mb-1 text-2xl font-bold">
                                {topTrack.title}
                              </h3>
                              <p className="text-muted-foreground">
                                Song • {topTrack.artist?.name}
                              </p>
                            </div>
                            <Button
                              size="icon-lg"
                              className="h-12 w-12 rounded-full"
                              onClick={() => playTrack(topTrack)}
                              aria-label="Play"
                            >
                              <Play className="ml-0.5 h-5 w-5 fill-current" />
                            </Button>
                          </div>
                        ) : topArtist ? (
                          <div className="space-y-4">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                              {topArtist.imageUrl ? (
                                // biome-ignore lint/performance/noImgElement: remote artwork
                                <img
                                  src={topArtist.imageUrl}
                                  alt={topArtist.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-10 w-10 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="mb-1 text-2xl font-bold">
                                {topArtist.name}
                              </h3>
                              <p className="text-muted-foreground">Artist</p>
                            </div>
                            <Button
                              asChild
                              size="icon-lg"
                              className="h-12 w-12 rounded-full"
                            >
                              <Link
                                href={`/artists/${topArtist.id}`}
                                aria-label="View artist"
                              >
                                <Play className="ml-0.5 h-5 w-5 fill-current" />
                              </Link>
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <div className="col-span-2 space-y-1">
                      <h3 className="mb-3 text-xl font-semibold">Songs</h3>
                      {results.tracks.slice(0, 4).map((track) => (
                        <TrackListItem
                          key={track.id}
                          track={track}
                          isPlaying={isPlaying}
                          isCurrentTrack={isCurrentTrack(track.id)}
                          onPlay={() => playTrack(track)}
                          showAlbum={true}
                          showAddButton={false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {results.artists.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Artists</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      {results.artists.slice(0, 6).map((artist) => (
                        <MediaCard
                          key={artist.id}
                          href={`/artists/${artist.id}`}
                          title={artist.name}
                          subtitle="Artist"
                          imageUrl={artist.imageUrl}
                          rounded
                          fallback={
                            <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                              <User className="h-10 w-10 text-muted-foreground" />
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tracks">
                <div className="space-y-1">
                  {results.tracks.map((track) => (
                    <TrackListItem
                      key={track.id}
                      track={track}
                      isPlaying={isPlaying}
                      isCurrentTrack={isCurrentTrack(track.id)}
                      onPlay={() => playTrack(track)}
                      showAlbum={true}
                      showAddButton={true}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="artists">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {results.artists.map((artist) => (
                    <MediaCard
                      key={artist.id}
                      href={`/artists/${artist.id}`}
                      title={artist.name}
                      subtitle="Artist"
                      imageUrl={artist.imageUrl}
                      rounded
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                          <User className="h-10 w-10 text-muted-foreground" />
                        </div>
                      }
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="albums">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {results.albums.map((album) => (
                    <MediaCard
                      key={album.id}
                      href={`/albums/${album.id}`}
                      title={album.title}
                      subtitle={album.artist?.name || "Album"}
                      imageUrl={album.coverImageUrl}
                      badge="Album"
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="playlists">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {results.playlists.map((playlist) => (
                    <MediaCard
                      key={playlist.id}
                      href={`/playlists/${playlist.id}`}
                      title={playlist.name}
                      subtitle="Playlist"
                      imageUrl={playlist.coverImageUrl}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <EmptyState
              icon={<Search />}
              title={`No results for "${query}"`}
              description="Try searching for something else or check your spelling."
            />
          )}
        </div>
      )}

      {/* Browse */}
      {!query && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            Browse all
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {BROWSE_CATEGORIES.map((category) => (
              <Card
                key={category.name}
                className={`group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl border-none bg-gradient-to-br ${category.color} shadow-lg transition-all active:scale-95`}
              >
                <CardContent className="relative z-10 flex h-full flex-col justify-between p-5">
                  <h3 className="text-xl font-black leading-none tracking-tighter text-white">
                    {category.name}
                  </h3>
                  <category.icon className="absolute -bottom-2 -right-2 h-16 w-16 -rotate-12 text-white/20 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110" />
                </CardContent>
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
