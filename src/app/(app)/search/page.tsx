"use client";

import {
  Headphones,
  Music,
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
  artist?: { id: string; name: string };
}

interface SearchPlaylist {
  id: string;
  name: string;
  coverImageUrl?: string;
  description?: string;
}

interface SearchResults {
  tracks: Track[];
  artists: SearchArtist[];
  albums: SearchAlbum[];
  playlists: SearchPlaylist[];
}

const STATIC_CATEGORIES = [
  { name: "New Releases", color: "from-rose-600 to-rose-900", icon: TrendingUp, href: "/tracks" },
  { name: "Albums", color: "from-purple-600 to-purple-900", icon: Music, href: "/albums" },
  { name: "Artists", color: "from-indigo-600 to-indigo-900", icon: User, href: "/artists" },
  { name: "Playlists", color: "from-emerald-600 to-emerald-900", icon: Music, href: "/playlists" },
  { name: "Daily Mixes", color: "from-violet-600 to-violet-900", icon: Music, href: "/daily-mixes" },
];

const GENRE_COLORS = [
  "from-pink-600 to-rose-900",
  "from-amber-600 to-amber-900",
  "from-sky-600 to-sky-900",
  "from-teal-600 to-teal-900",
  "from-orange-600 to-orange-900",
  "from-cyan-600 to-cyan-900",
  "from-fuchsia-600 to-fuchsia-900",
  "from-lime-600 to-lime-900",
  "from-red-600 to-red-900",
  "from-blue-600 to-blue-900",
  "from-green-600 to-green-900",
  "from-yellow-600 to-yellow-900",
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
  const [genres, setGenres] = useState<{ name: string; count: number }[]>([]);
  const { playTrack, isCurrentTrack, isPlaying } = useMusicPlayer();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => setGenres(data.genres || []))
      .catch(() => {});
  }, []);

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

  const hasTracks = results.tracks.length > 0;
  const hasArtists = results.artists.length > 0;
  const hasAlbums = results.albums.length > 0;
  const hasPlaylists = results.playlists.length > 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Search bar */}
      <div className="space-y-4 pt-2 lg:pt-0">
        <h1 className="text-2xl font-black tracking-tight lg:hidden">Search</h1>
        <form onSubmit={handleSearch} className="relative w-full lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artists, songs, albums, or playlists"
            className="h-12 rounded-xl border-0 bg-muted/40 pl-12 text-base focus-visible:ring-primary/20 md:h-14"
          />
        </form>
      </div>

      {/* Results */}
      {query && (
        <div className="space-y-6">
          {isLoading ? (
            <TrackListSkeleton count={8} />
          ) : totalResults > 0 ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6 flex w-full justify-start gap-1 overflow-x-auto no-scrollbar sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                {hasTracks && <TabsTrigger value="tracks">Songs ({results.tracks.length})</TabsTrigger>}
                {hasArtists && <TabsTrigger value="artists">Artists ({results.artists.length})</TabsTrigger>}
                {hasAlbums && <TabsTrigger value="albums">Albums ({results.albums.length})</TabsTrigger>}
                {hasPlaylists && <TabsTrigger value="playlists">Playlists ({results.playlists.length})</TabsTrigger>}
              </TabsList>

              <TabsContent value="all" className="space-y-8">
                {/* Top songs */}
                {hasTracks && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold tracking-tight md:text-xl">Songs</h2>
                    <div className="space-y-1">
                      {results.tracks.slice(0, 5).map((track) => (
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
                  </section>
                )}

                {/* Artists */}
                {hasArtists && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold tracking-tight md:text-xl">Artists</h2>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
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
                              <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Albums */}
                {hasAlbums && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold tracking-tight md:text-xl">Albums</h2>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
                      {results.albums.slice(0, 6).map((album) => (
                        <MediaCard
                          key={album.id}
                          href={`/albums/${album.id}`}
                          title={album.title}
                          subtitle={album.artist?.name || "Album"}
                          subtitleHref={album.artist ? `/artists/${album.artist.id}` : undefined}
                          imageUrl={album.coverImageUrl}
                          badge="Album"
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Playlists */}
                {hasPlaylists && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold tracking-tight md:text-xl">Playlists</h2>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
                      {results.playlists.slice(0, 6).map((playlist) => (
                        <MediaCard
                          key={playlist.id}
                          href={`/playlists/${playlist.id}`}
                          title={playlist.name}
                          subtitle="Playlist"
                          imageUrl={playlist.coverImageUrl}
                        />
                      ))}
                    </div>
                  </section>
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
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
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
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      }
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="albums">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
                  {results.albums.map((album) => (
                    <MediaCard
                      key={album.id}
                      href={`/albums/${album.id}`}
                      title={album.title}
                      subtitle={album.artist?.name || "Album"}
                      subtitleHref={album.artist ? `/artists/${album.artist.id}` : undefined}
                      imageUrl={album.coverImageUrl}
                      badge="Album"
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="playlists">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
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
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-700">
          <h2 className="text-xl font-black tracking-tight md:text-2xl">
            Browse all
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {STATIC_CATEGORIES.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className={`group relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br ${category.color} shadow-lg transition-all active:scale-95 hover:shadow-xl`}
              >
                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                  <h3 className="text-base font-black leading-none tracking-tight text-white md:text-lg">
                    {category.name}
                  </h3>
                  <category.icon className="absolute -bottom-2 -right-2 h-12 w-12 -rotate-12 text-white/20 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110 md:h-16 md:w-16" />
                </div>
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </Link>
            ))}
            {genres.map((genre, i) => (
              <Link
                key={genre.name}
                href={`/tracks?genre=${encodeURIComponent(genre.name)}`}
                className={`group relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br ${GENRE_COLORS[i % GENRE_COLORS.length]} shadow-lg transition-all active:scale-95 hover:shadow-xl`}
              >
                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                  <h3 className="text-base font-black leading-none tracking-tight text-white md:text-lg">
                    {genre.name}
                  </h3>
                  <span className="text-xs font-medium text-white/60">{genre.count} tracks</span>
                  <Headphones className="absolute -bottom-2 -right-2 h-12 w-12 -rotate-12 text-white/20 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110 md:h-16 md:w-16" />
                </div>
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </Link>
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
