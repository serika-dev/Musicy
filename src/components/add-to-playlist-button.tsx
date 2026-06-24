"use client";

import { Music, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddToPlaylist,
  useCreatePlaylist,
  usePlaylists,
} from "@/hooks/usePlaylist";

interface AddToPlaylistButtonProps {
  trackId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function AddToPlaylistButton({
  trackId,
  variant = "ghost",
  size = "sm",
  showText = false,
}: AddToPlaylistButtonProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(true);

  const { data: playlistsData } = usePlaylists(true, 50, 0); // User's playlists
  const createPlaylistMutation = useCreatePlaylist();
  const addToPlaylistMutation = useAddToPlaylist();

  if (!session) {
    return null;
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const newPlaylist = await createPlaylistMutation.mutateAsync({
        name: newPlaylistName,
        description: newPlaylistDescription,
        isPublic: newPlaylistPublic,
      });

      // Add track to the new playlist
      await addToPlaylistMutation.mutateAsync({
        playlistId: newPlaylist.id,
        trackId,
      });

      setIsCreating(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setNewPlaylistPublic(true);
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addToPlaylistMutation.mutateAsync({
        playlistId,
        trackId,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding to playlist:", error);
    }
  };

  return (
    <div
      className="flex items-center space-x-1"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Add to Playlist Button */}
      <Button
        variant={variant}
        size={size}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
      >
        <Plus className="w-4 h-4" />
        {showText && <span className="ml-1">Add to playlist</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription>
              Choose a playlist or create a new one
            </DialogDescription>
          </DialogHeader>

          {!isCreating ? (
            <div className="space-y-4">
              {/* Create New Playlist Option */}
              <Button
                variant="outline"
                onClick={() => setIsCreating(true)}
                className="w-full justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create new playlist
              </Button>

              {/* User's Playlists */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your playlists</Label>
                <ScrollArea className="h-48 w-full border rounded-md">
                  <div className="p-4 space-y-2">
                    {playlistsData?.playlists?.length ? (
                      playlistsData.playlists.map((playlist) => (
                        <Button
                          key={playlist.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => handleAddToPlaylist(playlist.id)}
                          disabled={addToPlaylistMutation.isPending}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Music className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{playlist.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {playlist._count?.tracks || 0} tracks
                              </p>
                            </div>
                          </div>
                        </Button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No playlists yet. Create your first one!
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Playlist name</Label>
                <Input
                  id="name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Enter playlist name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="Enter playlist description"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="public"
                  checked={newPlaylistPublic}
                  onCheckedChange={(checked: boolean) =>
                    setNewPlaylistPublic(checked)
                  }
                />
                <Label htmlFor="public">Make this playlist public</Label>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={
                    !newPlaylistName.trim() || createPlaylistMutation.isPending
                  }
                  className="flex-1"
                >
                  {createPlaylistMutation.isPending
                    ? "Creating..."
                    : "Create & Add"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
