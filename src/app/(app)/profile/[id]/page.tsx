"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Crown, Mail, Music, Settings, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface UserPlaylist {
  id: string;
  name: string;
  coverImageUrl?: string;
  _count?: { tracks: number };
}

// Hook to fetch user profile by ID
function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!userId,
  });
}

// Hook to fetch user's public playlists
function useUserPlaylists(userId: string) {
  return useQuery({
    queryKey: ["userPlaylists", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/playlists`);
      if (!response.ok) {
        throw new Error("Failed to fetch user playlists");
      }
      return response.json();
    },
    enabled: !!userId,
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params.id as string;

  const { data: profile, isLoading, error } = useUserProfile(userId);
  const { data: playlistsData, isLoading: playlistsLoading } =
    useUserPlaylists(userId);

  const isOwnProfile = session?.user?.id === userId;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <EmptyState
        icon={<User />}
        title="User not found"
        description="This user doesn't exist or their profile is private."
        action={<Button onClick={() => window.history.back()}>Go back</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {isOwnProfile
              ? "Your Profile"
              : `${profile.displayName || profile.username || "User"}'s Profile`}
          </h1>
          {isOwnProfile && (
            <Button asChild variant="outline">
              <Link href="/profile">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-6">
                  {/* Profile Picture */}
                  <div className="w-32 h-32 bg-gradient-to-br from-primary/30 to-primary/60 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.displayName || profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-primary/60" />
                    )}
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center space-x-2">
                        <span>
                          {profile.displayName ||
                            profile.username ||
                            "Anonymous User"}
                        </span>
                        {profile.role === "ADMIN" && (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        )}
                        {profile.isPremium && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                            Premium
                          </Badge>
                        )}
                      </h2>
                      {profile.username && profile.displayName && (
                        <p className="text-muted-foreground">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>
                          {isOwnProfile ? profile.email : "Email hidden"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Joined{" "}
                          {new Date(profile.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {profile._count?.playlists || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Playlists
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {profile._count?.likedTracks || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Liked Songs
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {profile._count?.tracks || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Uploads
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Public Playlists */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5" />
                  <span>Public Playlists</span>
                </CardTitle>
                <CardDescription>
                  {isOwnProfile
                    ? "Your public playlists"
                    : `${profile.displayName || "User"}'s public playlists`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {playlistsLoading ? (
                  <div className="space-y-3">
                    {["a", "b", "c"].map((k) => (
                      <div
                        key={k}
                        className="flex items-center space-x-4 p-3 rounded-md animate-pulse"
                      >
                        <div className="w-12 h-12 bg-muted rounded-md"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-1"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : playlistsData?.playlists &&
                  playlistsData.playlists.length > 0 ? (
                  <div className="space-y-3">
                    {playlistsData.playlists.map((playlist: UserPlaylist) => (
                      <Link
                        key={playlist.id}
                        href={`/playlists/${playlist.id}`}
                      >
                        <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-accent transition-colors cursor-pointer">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/60 rounded-md flex items-center justify-center overflow-hidden">
                            {playlist.coverImageUrl ? (
                              <img
                                src={playlist.coverImageUrl}
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-6 h-6 text-primary/60" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{playlist.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {playlist._count?.tracks || 0} tracks
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isOwnProfile
                      ? "You haven't created any public playlists yet."
                      : "No public playlists available."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role Badge */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  {profile.role === "ADMIN" ? (
                    <Crown className="w-12 h-12 text-yellow-500 mx-auto" />
                  ) : (
                    <User className="w-12 h-12 text-primary mx-auto" />
                  )}
                </div>
                <Badge
                  variant={
                    profile.role === "ADMIN" ? "destructive" : "secondary"
                  }
                  className="mb-2"
                >
                  {profile.role === "ADMIN" ? "Administrator" : "Music Lover"}
                </Badge>
                {profile.isPremium && (
                  <Badge className="block mt-2 bg-gradient-to-r from-purple-500 to-pink-500">
                    Premium Member
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link href="/playlists/create">Create Playlist</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/profile">Edit Profile</Link>
                  </Button>
                  {profile.role === "ADMIN" && (
                    <Button variant="secondary" className="w-full" asChild>
                      <Link href="/admin">Admin Panel</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
