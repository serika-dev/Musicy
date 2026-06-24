"use client";

import {
  Album,
  Crown,
  Edit,
  Eye,
  EyeOff,
  FileMusic,
  Music,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminArtists,
  useAdminTracks,
  useAdminUsers,
  useDeleteTrack,
  useDeleteUser,
  useLrcLibSearch,
  useToggleTrackVisibility,
  useUpdateTrackLyrics,
  useUpdateUserRole,
} from "@/hooks/useAdminData";
import { useProfile } from "@/hooks/useProfile";
import { formatDuration, formatFileSize } from "@/lib/utils";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTracks, setSearchTracks] = useState("");
  const [searchArtists, setSearchArtists] = useState("");
  const [selectedTrackForLyrics, setSelectedTrackForLyrics] =
    useState<any>(null);
  const [manualLyricsMode, setManualLyricsMode] = useState(false);
  const [manualLyricsData, setManualLyricsData] = useState({
    lrcId: "",
    plainLyrics: "",
    syncedLyrics: "",
  });
  const [availableArtists, setAvailableArtists] = useState<any[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<any[]>([]);
  const [autoExtractMode, setAutoExtractMode] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [conflictData, setConflictData] = useState<any>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [selectedArtistInDialog, setSelectedArtistInDialog] =
    useState<string>("");

  // System Settings state
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>(
    {},
  );
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);

  // Artist editing state
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [editArtistForm, setEditArtistForm] = useState({
    name: "",
    bio: "",
    website: "",
    verified: false,
    imageUrl: "",
    bannerUrl: "",
  });
  const [isUpdatingArtist, setIsUpdatingArtist] = useState(false);

  // Track editing state
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [editTrackForm, setEditTrackForm] = useState({
    title: "",
    genre: "",
    year: "",
    trackNumber: "",
  });
  const [isUpdatingTrack, setIsUpdatingTrack] = useState(false);

  const [uploadFormData, setUploadFormData] = useState({
    audioFile: null as File | null,
    coverImage: null as File | null,
    title: "",
    artistName: "",
    selectedArtistId: "",
    albumTitle: "",
    selectedAlbumId: "",
    trackNumber: "",
    year: "",
    genre: "",
    duration: "",
    bitRate: "",
    sampleRate: "",
    format: "",
    isPublic: true,
    albumDescription: "",
    albumType: "ALBUM",
    artistBio: "",
    artistWebsite: "",
    isVerified: false,
    lrcId: "",
    plainLyrics: "",
    syncedLyrics: "",
  });

  // Data hooks
  const { data: usersData, refetch: refetchUsers } = useAdminUsers(
    searchUsers,
    50,
    0,
  );
  const { data: tracksData, refetch: refetchTracks } = useAdminTracks(
    searchTracks,
    50,
    0,
  );
  const { data: artistsData, refetch: refetchArtists } = useAdminArtists(
    searchArtists,
    50,
    0,
  );

  // Mutation hooks
  const deleteTrack = useDeleteTrack();
  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();
  const toggleTrackVisibility = useToggleTrackVisibility();
  const searchLyrics = useLrcLibSearch();
  const updateTrackLyrics = useUpdateTrackLyrics();

  // Load available artists and albums
  useEffect(() => {
    const loadArtists = async () => {
      try {
        const response = await fetch("/api/admin/artists-list");
        if (response.ok) {
          const data = await response.json();
          setAvailableArtists(data.artists || []);
        }
      } catch (error) {
        console.error("Error loading artists:", error);
      }
    };

    const loadAlbums = async () => {
      try {
        const response = await fetch("/api/admin/albums-list");
        if (response.ok) {
          const data = await response.json();
          setAvailableAlbums(data.albums || []);
        }
      } catch (error) {
        console.error("Error loading albums:", error);
      }
    };

    if (activeTab === "upload") {
      loadArtists();
      loadAlbums();
    }
  }, [activeTab]);

  // Load system settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);
      try {
        const response = await fetch("/api/admin/settings");
        if (response.ok) {
          const data = await response.json();
          setSystemSettings(data.settings || {});
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    if (activeTab === "settings") {
      loadSettings();
    }
  }, [activeTab]);

  const handleUpdateSystemSetting = async (key: string, value: string) => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        toast.success(`System setting updated!`);
        setSystemSettings((prev) => ({ ...prev, [key]: value }));
      } else {
        toast.error("Failed to update system setting");
      }
    } catch (error) {
      console.error("Error updating system setting:", error);
      toast.error("Network error");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Auto-fetch lyrics when LRC ID is provided
  useEffect(() => {
    const fetchLyricsById = async () => {
      if (uploadFormData.lrcId && !uploadFormData.plainLyrics) {
        try {
          const response = await fetch(
            `https://lrclib.net/api/get/${uploadFormData.lrcId}`,
          );
          if (response.ok) {
            const lrcData = await response.json();
            setUploadFormData((prev) => ({
              ...prev,
              plainLyrics: lrcData.plainLyrics || "",
              syncedLyrics: lrcData.syncedLyrics || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching lyrics by ID:", error);
        }
      }
    };

    fetchLyricsById();
  }, [uploadFormData.lrcId, uploadFormData.plainLyrics]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (profile && profile.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  // Handle automatic metadata extraction from audio file
  const handleExtractMetadata = async (file: File) => {
    if (!file || !autoExtractMode) return;

    setIsExtracting(true);
    setExtractedMetadata(null);

    try {
      const formData = new FormData();
      formData.append("audioFile", file);
      formData.append("extractMetadata", "true");

      // Use the auto extraction endpoint for metadata only
      const response = await fetch("/api/admin/upload/track-auto", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const metadata = result.extractedMetadata;

        if (metadata) {
          setExtractedMetadata(metadata);
          // Pre-fill form with extracted metadata
          setUploadFormData((prev) => ({
            ...prev,
            title: metadata.title || prev.title,
            artistName: metadata.artist || prev.artistName,
            albumTitle: metadata.album || prev.albumTitle,
            trackNumber: metadata.trackNumber?.toString() || prev.trackNumber,
            year: metadata.year?.toString() || prev.year,
            genre: metadata.genre || prev.genre,
            duration: metadata.duration?.toString() || prev.duration,
            bitRate: metadata.bitrate?.toString() || prev.bitRate,
            sampleRate: metadata.sampleRate?.toString() || prev.sampleRate,
            format: metadata.format || prev.format,
          }));
        }

        alert(
          `Metadata extracted successfully! Found: ${metadata.title} by ${metadata.artist}`,
        );
      } else if (response.status === 409) {
        const error = await response.json();

        if (error.error === "ARTIST_CONFLICT") {
          // Show artist conflict resolution dialog during metadata extraction
          setConflictData(error);
          setExtractedMetadata(error.extractedMetadata); // Store the metadata anyway
          setSelectedArtistInDialog(error.conflictingArtists?.[0]?.id || ""); // Pre-select first artist
          setShowConflictDialog(true);

          // Pre-fill form with extracted metadata
          if (error.extractedMetadata) {
            const metadata = error.extractedMetadata;
            setUploadFormData((prev) => ({
              ...prev,
              title: metadata.title || prev.title,
              artistName: metadata.artist || prev.artistName,
              albumTitle: metadata.album || prev.albumTitle,
              trackNumber: metadata.trackNumber?.toString() || prev.trackNumber,
              year: metadata.year?.toString() || prev.year,
              genre: metadata.genre || prev.genre,
              duration: metadata.duration?.toString() || prev.duration,
              bitRate: metadata.bitrate?.toString() || prev.bitRate,
              sampleRate: metadata.sampleRate?.toString() || prev.sampleRate,
              format: metadata.format || prev.format,
            }));
          }
        } else {
          alert(`Metadata extraction failed: ${error.message}`);
        }
      } else {
        const error = await response.json();
        alert(`Metadata extraction failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Metadata extraction error:", error);
      alert("Metadata extraction failed: Network error");
    }

    setIsExtracting(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFormData.audioFile) {
      alert("Audio file is required");
      return;
    }

    // For manual mode, require title and artist
    if (
      !autoExtractMode &&
      (!uploadFormData.title || !uploadFormData.artistName)
    ) {
      alert("In manual mode, title and artist name are required");
      return;
    }

    // Set loading state
    setIsUploading(true);
    setUploadProgress("Preparing upload...");

    const formData = new FormData();

    // Add the extraction mode flag
    if (autoExtractMode) {
      formData.append("extractMetadata", "true");
    }

    // If we have a stored artist selection from conflict resolution, use it
    if (uploadFormData.selectedArtistId) {
      formData.append("artistOverrideId", uploadFormData.selectedArtistId);
    }

    Object.entries(uploadFormData).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        if (key === "isPublic" || key === "isVerified") {
          formData.append(key, value.toString());
        } else if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    try {
      // Choose the appropriate endpoint based on mode
      const endpoint = autoExtractMode
        ? "/api/admin/upload/track-auto"
        : "/api/admin/upload/track";

      setUploadProgress(`Uploading ${uploadFormData.audioFile.name}...`);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadProgress("Upload completed successfully!");

        setTimeout(() => {
          alert(`Track "${result.track.title}" uploaded successfully!`);

          // Reset form and state
          setUploadFormData({
            audioFile: null,
            coverImage: null,
            title: "",
            artistName: "",
            selectedArtistId: "",
            albumTitle: "",
            selectedAlbumId: "",
            trackNumber: "",
            year: "",
            genre: "",
            duration: "",
            bitRate: "",
            sampleRate: "",
            format: "",
            isPublic: true,
            albumDescription: "",
            albumType: "ALBUM",
            artistBio: "",
            artistWebsite: "",
            isVerified: false,
            lrcId: "",
            plainLyrics: "",
            syncedLyrics: "",
          });
          setExtractedMetadata(null);
          setConflictData(null);
          setSelectedArtistInDialog("");
          setIsUploading(false);
          setUploadProgress("");
          refetchTracks();
        }, 1000);
      } else if (response.status === 409) {
        const error = await response.json();

        if (error.error === "ARTIST_CONFLICT") {
          // Show artist conflict resolution dialog
          setConflictData(error);
          setSelectedArtistInDialog(error.conflictingArtists?.[0]?.id || ""); // Pre-select first artist
          setShowConflictDialog(true);
          // Don't reset loading state here - keep it until user resolves conflict
          setUploadProgress(
            "Artist name conflict detected - please choose an option",
          );
        } else if (error.error === "DUPLICATE_TRACK") {
          alert(`Upload failed: ${error.message}`);
          setIsUploading(false);
          setUploadProgress("");
        } else {
          alert(`Upload failed: ${error.message}`);
          setIsUploading(false);
          setUploadProgress("");
        }
      } else {
        const error = await response.json();

        // Handle network connectivity issues specifically
        if (
          response.status === 503 &&
          error.error === "NETWORK_CONNECTIVITY_ISSUE"
        ) {
          const { suggestions } = error;

          const message = `🌐 NETWORK CONNECTIVITY ISSUE DETECTED

${error.message}

Your connection has SSL/TLS issues with Cloudflare R2 for larger files.

SOLUTION STEPS:
${
  suggestions
    ?.slice(0, 6)
    .map(
      (suggestion: string, index: number) =>
        `${index + 1}. ${suggestion.replace(/^\d+️⃣\s*/, "")}`,
    )
    .join("\n") ||
  "1. Try from different network\n2. Use VPN\n3. Try during off-peak hours"
}

📋 This is a known network routing issue between your ISP and Cloudflare R2.
📋 The problem is NOT with the app - it's network infrastructure.
📋 Small files (cover art) work fine, but larger files fail due to SSL timeouts.`;

          alert(message);
        }
        // Handle other R2 upload failures
        else if (
          response.status === 503 &&
          error.error === "R2_UPLOAD_FAILED"
        ) {
          const { fileInfo, suggestions } = error;
          const uploadStrategy = fileInfo?.uploadStrategy || "Unknown";
          const fileSize = fileInfo?.size || "Unknown size";
          const isLargeFile = fileInfo?.isLargeFile || false;

          const message = `R2 Upload Failed: ${error.details}
          
File Info: ${fileSize} (${uploadStrategy})
Cover Upload: ${fileInfo?.coverUploadWorked ? "✅ SUCCESS" : "❌ FAILED"}

${isLargeFile ? "🎯 Large File Strategy Used" : "🚀 Standard Upload Used"}

Top Suggestions:
• ${suggestions?.[0] || "Check internet connection"}  
• ${suggestions?.[1] || "Try from different network"}
• Run: node scripts/test-r2-connection.js

Note: Cover art uploaded successfully, so R2 connection works.
This is specifically an audio file upload issue.`;

          alert(message);
        } else {
          alert(`Upload failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      // More specific error messages for network issues
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        alert(
          `Upload failed: Network connection error. Please check your internet connection and try again.`,
        );
      } else if (error.message && error.message.includes("timeout")) {
        alert(
          `Upload failed: Request timeout. Large files may take longer to upload. Please try again.`,
        );
      } else {
        alert(
          `Upload failed: Network error. Please check your connection and try again.`,
        );
      }
    } finally {
      // Always reset loading state
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Handle artist edit click
  const handleEditArtistClick = (artist: any) => {
    setEditingArtist(artist);
    setEditArtistForm({
      name: artist.name || "",
      bio: artist.bio || "",
      website: artist.website || "",
      verified: artist.verified || false,
      imageUrl: artist.imageUrl || "",
      bannerUrl: artist.bannerUrl || "",
    });
  };

  // Handle artist update
  const handleUpdateArtist = async () => {
    if (!editingArtist) return;

    setIsUpdatingArtist(true);
    try {
      const response = await fetch(`/api/admin/artists/${editingArtist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editArtistForm.name,
          bio: editArtistForm.bio,
          website: editArtistForm.website,
          verified: editArtistForm.verified,
          imageUrl: editArtistForm.imageUrl,
          bannerUrl: editArtistForm.bannerUrl,
        }),
      });

      if (response.ok) {
        toast.success(`Artist "${editArtistForm.name}" updated successfully!`);
        setEditingArtist(null);
        refetchArtists();
      } else {
        const error = await response.json();
        toast.error(`Failed to update artist: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating artist:", error);
      toast.error("Failed to update artist: Network error");
    } finally {
      setIsUpdatingArtist(false);
    }
  };

  // Handle artist delete
  const handleDeleteArtist = async (artistId: string, artistName: string) => {
    if (
      !confirm(
        `Delete artist "${artistName}"? This will also delete all their tracks and albums. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/artists/${artistId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`Artist "${artistName}" deleted successfully!`);
        refetchArtists();
      } else {
        const error = await response.json();
        toast.error(`Failed to delete artist: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to delete artist: Network error");
    }
  };

  // Handle track edit click
  const handleEditTrackClick = (track: any) => {
    setEditingTrack(track);
    setEditTrackForm({
      title: track.title || "",
      genre: track.genre || "",
      year: track.year ? String(track.year) : "",
      trackNumber: track.trackNumber ? String(track.trackNumber) : "",
    });
  };

  // Handle track update
  const handleUpdateTrack = async () => {
    if (!editingTrack) return;

    setIsUpdatingTrack(true);
    try {
      const response = await fetch(`/api/admin/tracks/${editingTrack.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTrackForm.title,
          genre: editTrackForm.genre || null,
          year: editTrackForm.year ? parseInt(editTrackForm.year) : null,
          trackNumber: editTrackForm.trackNumber
            ? parseInt(editTrackForm.trackNumber)
            : null,
        }),
      });

      if (response.ok) {
        toast.success(`Track "${editTrackForm.title}" updated successfully!`);
        setEditingTrack(null);
        refetchTracks();
      } else {
        const error = await response.json();
        toast.error(`Failed to update track: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating track:", error);
      toast.error("Failed to update track: Network error");
    } finally {
      setIsUpdatingTrack(false);
    }
  };

  // Handle artist conflict resolution
  const handleArtistConflictResolution = async (
    action: "existing" | "new",
    selectedArtistId?: string,
  ) => {
    if (!conflictData) return;

    // If this is just metadata extraction (no actual upload yet)
    if (isExtracting) {
      // Just store the artist selection and close dialog
      if (action === "existing" && selectedArtistId) {
        // Update form with the selected existing artist
        setUploadFormData((prev) => ({
          ...prev,
          selectedArtistId: selectedArtistId,
          // Keep the artistName as is for display, but mark the selection
        }));
        alert(`✅ Selected existing artist! You can now upload the track.`);
      } else if (action === "new") {
        // Clear any artist selection to create new one
        setUploadFormData((prev) => ({
          ...prev,
          selectedArtistId: "",
        }));
        alert(`✅ Will create a new artist! You can now upload the track.`);
      }

      setShowConflictDialog(false);
      setSelectedArtistInDialog("");
      setIsExtracting(false);
      return;
    }

    // Otherwise, this is during upload - proceed with full upload
    if (!uploadFormData.audioFile) return;

    const formData = new FormData();

    // Add the extraction mode flag
    if (autoExtractMode) {
      formData.append("extractMetadata", "true");
    }

    // Add artist resolution
    if (action === "existing" && selectedArtistId) {
      formData.append("artistOverrideId", selectedArtistId);
    }

    // Add all other form data
    Object.entries(uploadFormData).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        if (key === "isPublic" || key === "isVerified") {
          formData.append(key, value.toString());
        } else if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    try {
      const endpoint = autoExtractMode
        ? "/api/admin/upload/track-auto"
        : "/api/admin/upload/track";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Track "${result.track.title}" uploaded successfully!`);

        // Reset everything
        setUploadFormData({
          audioFile: null,
          coverImage: null,
          title: "",
          artistName: "",
          selectedArtistId: "",
          albumTitle: "",
          selectedAlbumId: "",
          trackNumber: "",
          year: "",
          genre: "",
          duration: "",
          bitRate: "",
          sampleRate: "",
          format: "",
          isPublic: true,
          albumDescription: "",
          albumType: "ALBUM",
          artistBio: "",
          artistWebsite: "",
          isVerified: false,
          lrcId: "",
          plainLyrics: "",
          syncedLyrics: "",
        });
        setExtractedMetadata(null);
        setConflictData(null);
        setSelectedArtistInDialog("");
        setShowConflictDialog(false);
        refetchTracks();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: Network error");
    }
  };

  const handleSearchLyrics = async (track: any) => {
    try {
      console.log(
        "🔍 Searching lyrics for:",
        track.title,
        "by",
        track.artist.name,
      );

      const result = await searchLyrics.mutateAsync({
        artist: track.artist.name,
        track: track.title,
      });

      console.log("📋 Search result:", result);

      if (result.found && result.data) {
        const lrcData = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

        // Verify the data has actual lyrics content
        if (lrcData && (lrcData.plainLyrics || lrcData.syncedLyrics)) {
          console.log("✅ Found lyrics with content");
          setSelectedTrackForLyrics({
            ...track,
            lrcData,
          });
          setManualLyricsMode(false);
        } else {
          console.log("⚠️ Found results but no lyrics content");
          // Switch to manual mode even if found=true but no content
          setSelectedTrackForLyrics(track);
          setManualLyricsMode(true);
          setManualLyricsData({
            lrcId: "",
            plainLyrics: "",
            syncedLyrics: "",
          });

          // Show helpful message about the search results
          if (result.results && result.results.length > 0) {
            console.log("📄 Available results without lyrics:", result.results);
          }
        }
      } else {
        // No lyrics found - switch to manual mode
        console.log("❌ No lyrics found, switching to manual mode");
        setSelectedTrackForLyrics(track);
        setManualLyricsMode(true);
        setManualLyricsData({
          lrcId: "",
          plainLyrics: "",
          syncedLyrics: "",
        });

        // Log detailed search information for debugging
        if (result.searchAttempts) {
          console.log("🔍 Search attempts:", result.searchAttempts);
        }
        if (result.resultsFound) {
          console.log(
            `📊 Found ${result.resultsFound} results but no lyrics content`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Lyrics search error:", error);

      // Still switch to manual mode on error so user can continue
      setSelectedTrackForLyrics(track);
      setManualLyricsMode(true);
      setManualLyricsData({
        lrcId: "",
        plainLyrics: "",
        syncedLyrics: "",
      });

      alert(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}. You can still add lyrics manually.`,
      );
    }
  };

  const handleSearchByLrcId = async (lrcId: string) => {
    if (!lrcId || !selectedTrackForLyrics) return;

    try {
      const response = await fetch(`https://lrclib.net/api/get/${lrcId}`);

      if (response.ok) {
        const lrcData = await response.json();
        setManualLyricsData({
          lrcId: lrcId,
          plainLyrics: lrcData.plainLyrics || "",
          syncedLyrics: lrcData.syncedLyrics || "",
        });
      } else {
        alert(`No lyrics found for LRC ID: ${lrcId}`);
      }
    } catch (error) {
      console.error("Error fetching lyrics by ID:", error);
      alert("Failed to fetch lyrics by ID");
    }
  };

  const handleUpdateLyrics = async () => {
    if (!selectedTrackForLyrics) return;

    try {
      if (manualLyricsMode) {
        // Use manual lyrics data
        await updateTrackLyrics.mutateAsync({
          trackId: selectedTrackForLyrics.id,
          lrcId: manualLyricsData.lrcId
            ? parseInt(manualLyricsData.lrcId)
            : undefined,
          plainLyrics: manualLyricsData.plainLyrics || undefined,
          syncedLyrics: manualLyricsData.syncedLyrics || undefined,
        });
      } else {
        // Use automatic search data
        await updateTrackLyrics.mutateAsync({
          trackId: selectedTrackForLyrics.id,
          lrcId: selectedTrackForLyrics.lrcData?.id,
          plainLyrics: selectedTrackForLyrics.lrcData?.plainLyrics,
          syncedLyrics: selectedTrackForLyrics.lrcData?.syncedLyrics,
        });
      }

      alert("Lyrics updated successfully!");
      setSelectedTrackForLyrics(null);
      setManualLyricsMode(false);
      setManualLyricsData({ lrcId: "", plainLyrics: "", syncedLyrics: "" });
      refetchTracks();
    } catch (error) {
      console.error("Error updating lyrics:", error);
      alert("Failed to update lyrics");
    }
  };

  if (status === "loading" || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session || !profile || profile.role !== "ADMIN") {
    return (
      <EmptyState
        icon={<Crown />}
        title="Access denied"
        description="This area is restricted to administrators only."
        action={<Button onClick={() => router.push("/")}>Go to home</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive platform management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium">Administrator</span>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracks">Manage Tracks</TabsTrigger>
            <TabsTrigger value="artists">Manage Artists</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
            <TabsTrigger value="upload">Upload Track</TabsTrigger>
            <TabsTrigger value="lyrics">Lyrics Manager</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Tracks
                  </CardTitle>
                  <Music className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tracksData?.total || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usersData?.total || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Public Tracks
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tracksData?.tracks?.filter((t: any) => t.isPublic)
                      .length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Admin Users
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usersData?.users?.filter((u: any) => u.role === "ADMIN")
                      .length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tracks Management Tab */}
          <TabsContent value="tracks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Track Management</h2>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search tracks..."
                  value={searchTracks}
                  onChange={(e) => setSearchTracks(e.target.value)}
                  className="w-64"
                />
                <Button onClick={() => refetchTracks()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracksData?.tracks?.map((track: any) => (
                      <TableRow key={track.id}>
                        <TableCell className="font-medium">
                          {track.title}
                        </TableCell>
                        <TableCell>
                          {track.artist.name}
                          {track.artist.verified && (
                            <Badge className="ml-2">Verified</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(track.duration)}</TableCell>
                        <TableCell>{track.format}</TableCell>
                        <TableCell>
                          <Badge
                            variant={track.isPublic ? "default" : "secondary"}
                          >
                            {track.isPublic ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTrackClick(track)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toggleTrackVisibility.mutate({
                                  trackId: track.id,
                                  isPublic: !track.isPublic,
                                })
                              }
                            >
                              {track.isPublic ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSearchLyrics(track)}
                            >
                              🎵
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete track "${track.title}"?`)) {
                                  deleteTrack.mutate(track.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Artists Management Tab */}
          <TabsContent value="artists" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Artist Management</h2>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search artists..."
                  value={searchArtists}
                  onChange={(e) => setSearchArtists(e.target.value)}
                  className="w-64"
                />
                <Button onClick={() => refetchArtists()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Tracks</TableHead>
                      <TableHead>Albums</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artistsData?.artists.map((artist: any) => (
                      <TableRow key={artist.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                              {artist.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{artist.name}</div>
                              {artist.bio && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {artist.bio.length > 60
                                    ? `${artist.bio.substring(0, 60)}...`
                                    : artist.bio}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {artist.verified ? (
                            <Badge
                              variant="default"
                              className="bg-blue-100 text-blue-800"
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Music className="w-4 h-4 text-muted-foreground" />
                            <span>{artist._count.tracks}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Album className="w-4 h-4 text-muted-foreground" />
                            <span>{artist._count.albums}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(artist.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditArtistClick(artist)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(`/artists/${artist.id}`, "_blank");
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteArtist(artist.id, artist.name)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Artist Stats */}
            <div className="text-sm text-muted-foreground">
              Showing {artistsData?.artists.length || 0} of{" "}
              {artistsData?.total || 0} artists
            </div>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search users..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="w-64"
                />
                <Button onClick={() => refetchUsers()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.email}
                        </TableCell>
                        <TableCell>{user.username || "—"}</TableCell>
                        <TableCell>{user.displayName || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "ADMIN" ? "destructive" : "default"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isPremium ? (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateUserRole.mutate({
                                  userId: user.id,
                                  role:
                                    user.role === "ADMIN" ? "USER" : "ADMIN",
                                })
                              }
                            >
                              {user.role === "ADMIN" ? "Demote" : "Promote"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete user "${user.email}"?`)) {
                                  deleteUser.mutate(user.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Track</CardTitle>
                <CardDescription>
                  Upload high-quality music with automatic metadata extraction
                  or manual entry
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Upload Mode Toggle */}
                <div className="mb-6 p-4 border rounded-lg">
                  <Label className="text-base font-semibold">Upload Mode</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="auto-mode"
                        name="upload-mode"
                        checked={autoExtractMode}
                        onChange={() => setAutoExtractMode(true)}
                        className="w-4 h-4"
                      />
                      <Label
                        htmlFor="auto-mode"
                        className="font-medium text-primary"
                      >
                        🎵 Automatic Metadata Extraction
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Automatically extract title, artist, album, genre, and
                      other metadata from audio files. Supports embedded cover
                      art extraction.
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="manual-mode"
                        name="upload-mode"
                        checked={!autoExtractMode}
                        onChange={() => setAutoExtractMode(false)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="manual-mode" className="font-medium">
                        ✏️ Manual Entry
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Manually enter all track information and metadata fields.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
                  {/* File uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="audioFile">Audio File *</Label>
                      <Input
                        id="audioFile"
                        type="file"
                        accept=".flac,.wav,.mp3,.alac"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] || null;
                          setUploadFormData({
                            ...uploadFormData,
                            audioFile: file,
                          });

                          // Auto-extract metadata if in auto mode
                          if (file && autoExtractMode) {
                            await handleExtractMetadata(file);
                          }
                        }}
                        required
                      />
                      {isExtracting && (
                        <p className="text-sm text-primary mt-1">
                          🔄 Extracting metadata...
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="coverImage">
                        Cover Image{" "}
                        {autoExtractMode &&
                          "(Optional - will use embedded art if available)"}
                      </Label>
                      <Input
                        id="coverImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            coverImage: e.target.files?.[0] || null,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Show extracted metadata */}
                  {autoExtractMode && extractedMetadata && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-800">
                          ✅ Extracted Metadata
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Title:</strong> {extractedMetadata.title}
                          </div>
                          <div>
                            <strong>Artist:</strong> {extractedMetadata.artist}
                          </div>
                          <div>
                            <strong>Album:</strong>{" "}
                            {extractedMetadata.album || "N/A"}
                          </div>
                          <div>
                            <strong>Genre:</strong>{" "}
                            {extractedMetadata.genre || "N/A"}
                          </div>
                          <div>
                            <strong>Year:</strong>{" "}
                            {extractedMetadata.year || "N/A"}
                          </div>
                          <div>
                            <strong>Duration:</strong>{" "}
                            {extractedMetadata.duration
                              ? `${Math.floor(extractedMetadata.duration / 60)}:${(extractedMetadata.duration % 60).toString().padStart(2, "0")}`
                              : "N/A"}
                          </div>
                          <div>
                            <strong>Format:</strong> {extractedMetadata.format}
                          </div>
                          <div>
                            <strong>Bitrate:</strong>{" "}
                            {extractedMetadata.bitrate
                              ? `${extractedMetadata.bitrate} kbps`
                              : "N/A"}
                          </div>
                        </div>
                        <p className="text-xs text-green-700 mt-2">
                          You can override any of these values in the form
                          fields below.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Basic metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Track Title *</Label>
                      <Input
                        id="title"
                        value={uploadFormData.title}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            title: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="genre">Genre</Label>
                      <Input
                        id="genre"
                        value={uploadFormData.genre}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            genre: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Artist Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label>Artist Selection *</Label>
                      {uploadFormData.selectedArtistId && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✅ Artist pre-selected from conflict resolution
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="existingArtist">
                          Select Existing Artist
                        </Label>
                        <select
                          id="existingArtist"
                          value={uploadFormData.selectedArtistId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedArtist = availableArtists.find(
                              (a) => a.id === selectedId,
                            );
                            setUploadFormData({
                              ...uploadFormData,
                              selectedArtistId: selectedId,
                              artistName: selectedArtist?.name || "",
                            });
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value="">Choose existing artist...</option>
                          {availableArtists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                              {artist.name} {artist.verified ? "✓" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="artistName">
                          Or Create New Artist *
                        </Label>
                        <Input
                          id="artistName"
                          value={uploadFormData.artistName}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              artistName: e.target.value,
                              selectedArtistId: "",
                            })
                          }
                          placeholder="New artist name..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Album Selection */}
                  <div className="space-y-4">
                    <Label>Album Selection (Optional)</Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="existingAlbum">
                          Select Existing Album
                        </Label>
                        <select
                          id="existingAlbum"
                          value={uploadFormData.selectedAlbumId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedAlbum = availableAlbums.find(
                              (a) => a.id === selectedId,
                            );
                            setUploadFormData({
                              ...uploadFormData,
                              selectedAlbumId: selectedId,
                              albumTitle: selectedAlbum?.title || "",
                            });
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value="">Choose existing album...</option>
                          {availableAlbums
                            .filter(
                              (album) =>
                                !uploadFormData.selectedArtistId ||
                                album.artist.id ===
                                  uploadFormData.selectedArtistId,
                            )
                            .map((album) => (
                              <option key={album.id} value={album.id}>
                                {album.title} - {album.artist.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="albumTitle">Or Create New Album</Label>
                        <Input
                          id="albumTitle"
                          value={uploadFormData.albumTitle}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              albumTitle: e.target.value,
                              selectedAlbumId: "",
                            })
                          }
                          placeholder="New album title..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="trackNumber">Track #</Label>
                      <Input
                        id="trackNumber"
                        type="number"
                        value={uploadFormData.trackNumber}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            trackNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={uploadFormData.year}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            year: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={uploadFormData.duration}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            duration: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="format">Format</Label>
                      <select
                        id="format"
                        value={uploadFormData.format}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            format: e.target.value,
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">Auto-detect</option>
                        <option value="FLAC">FLAC</option>
                        <option value="WAV">WAV</option>
                        <option value="MP3">MP3</option>
                        <option value="ALAC">ALAC</option>
                      </select>
                    </div>
                  </div>

                  {/* LRCLib Integration */}
                  <div className="space-y-4">
                    <Label>Lyrics Integration (LRCLib)</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="lrcId">
                          LRCLib ID (Auto-fetches lyrics)
                        </Label>
                        <Input
                          id="lrcId"
                          type="number"
                          value={uploadFormData.lrcId}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              lrcId: e.target.value,
                            })
                          }
                          placeholder="e.g., 10246713 - Will auto-fetch lyrics"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter LRCLib ID to automatically fetch lyrics, or
                          manually add lyrics below
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="plainLyrics">Plain Lyrics</Label>
                        <Textarea
                          id="plainLyrics"
                          value={uploadFormData.plainLyrics}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              plainLyrics: e.target.value,
                            })
                          }
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="syncedLyrics">
                          Synced Lyrics (LRC Format)
                        </Label>
                        <Textarea
                          id="syncedLyrics"
                          value={uploadFormData.syncedLyrics}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              syncedLyrics: e.target.value,
                            })
                          }
                          rows={4}
                          placeholder="[00:11.64] First line of lyrics"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={uploadFormData.isPublic}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            isPublic: e.target.checked,
                          })
                        }
                      />
                      <span>Public Track</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={uploadFormData.isVerified}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            isVerified: e.target.checked,
                          })
                        }
                      />
                      <span>Verified Artist</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    {/* Upload Progress Indicator */}
                    {isUploading && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <div className="flex-1">
                            <div className="font-medium text-blue-900">
                              {uploadProgress || "Uploading..."}
                            </div>
                            <div className="text-sm text-blue-600">
                              Please wait, this may take a few moments for large
                              files...
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Track
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center space-y-1">
                      {/* File size info */}
                      {uploadFormData.audioFile && !isUploading && (
                        <div className="text-primary font-medium">
                          File:{" "}
                          {(
                            uploadFormData.audioFile.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                          {uploadFormData.audioFile.size > 20 * 1024 * 1024 && (
                            <span className="ml-1 text-orange-600">
                              ⚡ Large file - multipart upload will be used
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        Having R2 upload issues?
                        <button
                          type="button"
                          className="text-primary hover:underline ml-1"
                          onClick={() => {
                            if (
                              confirm(
                                "This will test your R2 connection. Open developer console to see results. Continue?",
                              )
                            ) {
                              fetch("/api/admin/test-r2", { method: "POST" })
                                .then((res) => res.json())
                                .then((data) => {
                                  console.log("R2 Test Results:", data);
                                  alert(
                                    `R2 Test ${data.success ? "PASSED" : "FAILED"}. Check console for details.`,
                                  );
                                })
                                .catch((err) => {
                                  console.error("R2 Test Error:", err);
                                  alert(
                                    "R2 Test failed. Check console for details.",
                                  );
                                });
                            }
                          }}
                        >
                          Test R2 Connection
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lyrics Manager Tab */}
          <TabsContent value="lyrics" className="space-y-6">
            <h2 className="text-2xl font-bold">Lyrics Management</h2>
            <p className="text-muted-foreground">
              Search and manage lyrics using the LRCLib API integration
            </p>

            {tracksData?.tracks && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Tracks</CardTitle>
                  <CardDescription>
                    Click "Search Lyrics" to find lyrics for any track
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tracksData.tracks.slice(0, 10).map((track: any) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <p className="font-medium">{track.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {track.artist.name}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSearchLyrics(track)}
                          disabled={searchLyrics.isPending}
                        >
                          {searchLyrics.isPending
                            ? "Searching..."
                            : "Search Lyrics"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="settings" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Global System Settings</h2>
                <p className="text-muted-foreground text-sm">
                  Manage platform-wide configurations
                </p>
              </div>
              {isSettingsLoading && (
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-primary/20 bg-primary/5 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2 text-primary">
                    <Shield className="w-5 h-5" />
                    <CardTitle className="text-lg">Access Control</CardTitle>
                  </div>
                  <CardDescription>
                    Security and registration management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="space-y-1 pr-4">
                      <Label
                        htmlFor="allow-reg"
                        className="text-base font-semibold"
                      >
                        User Registration
                      </Label>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Toggle new account creation. If disabled, visitors will
                        see a "Maintenance" notice on the sign-up page.
                      </p>
                    </div>
                    <Switch
                      id="allow-reg"
                      checked={systemSettings.allow_registration !== "false"}
                      onCheckedChange={(checked) =>
                        handleUpdateSystemSetting(
                          "allow_registration",
                          checked.toString(),
                        )
                      }
                      disabled={isUpdatingSettings || isSettingsLoading}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50 opacity-50 cursor-not-allowed">
                    <div className="space-y-1 pr-4">
                      <Label className="text-base font-semibold">
                        Public API Access
                      </Label>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Enable unauthenticated access to public metadata
                        endpoints. (Coming soon)
                      </p>
                    </div>
                    <Switch disabled checked={false} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Settings className="w-5 h-5" />
                    <CardTitle className="text-lg">
                      Maintenance & Operations
                    </CardTitle>
                  </div>
                  <CardDescription>Server-side system flags</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2 py-8">
                    <Shield className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                      More system-wide controls will be available in future
                      updates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Enhanced Lyrics Dialog with Manual Input Support */}
        {selectedTrackForLyrics && (
          <Dialog
            open={!!selectedTrackForLyrics}
            onOpenChange={() => {
              setSelectedTrackForLyrics(null);
              setManualLyricsMode(false);
              setManualLyricsData({
                lrcId: "",
                plainLyrics: "",
                syncedLyrics: "",
              });
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Lyrics for "{selectedTrackForLyrics.title}" by{" "}
                  {selectedTrackForLyrics.artist.name}
                </DialogTitle>
                <DialogDescription>
                  {manualLyricsMode ? (
                    <span className="text-orange-600">
                      Manual lyrics entry mode
                    </span>
                  ) : (
                    selectedTrackForLyrics.lrcData &&
                    `LRCLib ID: ${selectedTrackForLyrics.lrcData.id} | Duration: ${selectedTrackForLyrics.lrcData.duration}s`
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {manualLyricsMode ? (
                  // Manual Input Mode
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="font-medium text-orange-800">
                          No lyrics found automatically
                        </span>
                      </div>
                      <p className="text-sm text-orange-700">
                        You can either search by LRCLib ID or manually enter
                        lyrics below.
                      </p>
                    </div>

                    {/* Manual LRCLib ID Search */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-lrc-id">Search by LRCLib ID</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="manual-lrc-id"
                          placeholder="Enter LRCLib ID (e.g., 10246713)"
                          value={manualLyricsData.lrcId}
                          onChange={(e) =>
                            setManualLyricsData({
                              ...manualLyricsData,
                              lrcId: e.target.value,
                            })
                          }
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleSearchByLrcId(manualLyricsData.lrcId)
                          }
                          disabled={!manualLyricsData.lrcId}
                        >
                          Search
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Find LRCLib IDs at{" "}
                        <a
                          href="https://lrclib.net"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          lrclib.net
                        </a>
                      </p>
                    </div>

                    {/* Manual Lyrics Input */}
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="manual-plain-lyrics">
                          Plain Lyrics
                        </Label>
                        <textarea
                          id="manual-plain-lyrics"
                          className="w-full h-32 p-3 border border-input rounded-md resize-none"
                          placeholder="Enter plain lyrics here..."
                          value={manualLyricsData.plainLyrics}
                          onChange={(e) =>
                            setManualLyricsData({
                              ...manualLyricsData,
                              plainLyrics: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-synced-lyrics">
                          Synced Lyrics (LRC Format)
                        </Label>
                        <textarea
                          id="manual-synced-lyrics"
                          className="w-full h-40 p-3 border border-input rounded-md resize-none font-mono text-sm"
                          placeholder="[00:11.64] First line of lyrics&#10;[00:15.30] Second line of lyrics&#10;[00:18.96] Third line of lyrics"
                          value={manualLyricsData.syncedLyrics}
                          onChange={(e) =>
                            setManualLyricsData({
                              ...manualLyricsData,
                              syncedLyrics: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: [mm:ss.xx] Lyric text. Use tools like{" "}
                          <a
                            href="https://lrclib.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            LRCLib
                          </a>{" "}
                          to create synced lyrics.
                        </p>
                      </div>
                    </div>

                    {/* Preview */}
                    {(manualLyricsData.plainLyrics ||
                      manualLyricsData.syncedLyrics) && (
                      <div className="space-y-3">
                        <Label>Preview</Label>
                        {manualLyricsData.plainLyrics && (
                          <div className="p-3 bg-muted rounded-md">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Plain Lyrics:
                            </div>
                            <div className="text-sm max-h-32 overflow-y-auto">
                              {manualLyricsData.plainLyrics
                                .split("\n")
                                .slice(0, 6)
                                .join("\n")}
                              {manualLyricsData.plainLyrics.split("\n").length >
                                6 && "..."}
                            </div>
                          </div>
                        )}
                        {manualLyricsData.syncedLyrics && (
                          <div className="p-3 bg-muted rounded-md">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Synced Lyrics:
                            </div>
                            <div className="text-sm font-mono max-h-32 overflow-y-auto">
                              {manualLyricsData.syncedLyrics
                                .split("\n")
                                .slice(0, 5)
                                .join("\n")}
                              {manualLyricsData.syncedLyrics.split("\n")
                                .length > 5 && "..."}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Automatic Search Results Mode
                  <div className="space-y-4">
                    {selectedTrackForLyrics.lrcData?.plainLyrics && (
                      <div>
                        <Label>Plain Lyrics Preview</Label>
                        <div className="p-3 bg-muted rounded max-h-32 overflow-y-auto text-sm">
                          {selectedTrackForLyrics.lrcData.plainLyrics.substring(
                            0,
                            200,
                          )}
                          ...
                        </div>
                      </div>
                    )}
                    {selectedTrackForLyrics.lrcData?.syncedLyrics && (
                      <div>
                        <Label>Synced Lyrics Preview</Label>
                        <div className="p-3 bg-muted rounded max-h-32 overflow-y-auto text-sm font-mono">
                          {selectedTrackForLyrics.lrcData.syncedLyrics
                            .split("\n")
                            .slice(0, 5)
                            .join("\n")}
                          ...
                        </div>
                      </div>
                    )}

                    {/* Switch to Manual Mode Button */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setManualLyricsMode(true);
                          // Pre-fill with found data if available
                          if (selectedTrackForLyrics.lrcData?.id) {
                            setManualLyricsData((prev) => ({
                              ...prev,
                              lrcId: String(selectedTrackForLyrics.lrcData.id),
                              plainLyrics:
                                selectedTrackForLyrics.lrcData.plainLyrics ||
                                "",
                              syncedLyrics:
                                selectedTrackForLyrics.lrcData.syncedLyrics ||
                                "",
                            }));
                          }
                        }}
                      >
                        ✏️ Edit Lyrics Manually
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Switch to manual mode to customize or replace the found
                        lyrics
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between">
                <div className="flex space-x-2">
                  {manualLyricsMode && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setManualLyricsMode(false);
                        setManualLyricsData({
                          lrcId: "",
                          plainLyrics: "",
                          syncedLyrics: "",
                        });
                      }}
                    >
                      ← Back to Search
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTrackForLyrics(null);
                      setManualLyricsMode(false);
                      setManualLyricsData({
                        lrcId: "",
                        plainLyrics: "",
                        syncedLyrics: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateLyrics}
                    disabled={
                      updateTrackLyrics.isPending ||
                      (manualLyricsMode &&
                        !manualLyricsData.plainLyrics &&
                        !manualLyricsData.syncedLyrics)
                    }
                  >
                    {updateTrackLyrics.isPending
                      ? "Updating..."
                      : "Add Lyrics to Track"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Artist Conflict Resolution Dialog */}
        <Dialog
          open={showConflictDialog}
          onOpenChange={(open: boolean) => {
            setShowConflictDialog(open);
            if (!open) {
              setSelectedArtistInDialog("");
              setConflictData(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>🎤 Artist Already Exists!</DialogTitle>
              <DialogDescription>
                Yo! There's already an artist named "
                {conflictData?.conflictingArtists?.[0]?.name}" in the system.
                Want to add this track to the existing artist, or create a
                separate new artist with the same name?
              </DialogDescription>
            </DialogHeader>

            {conflictData?.conflictingArtists && (
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Existing Artists:</Label>
                  <div className="space-y-2 mt-2">
                    {conflictData.conflictingArtists.map((artist: any) => (
                      <div
                        key={artist.id}
                        className="flex items-center space-x-2 p-2 border rounded"
                      >
                        <input
                          type="radio"
                          id={`artist-${artist.id}`}
                          name="selected-artist"
                          value={artist.id}
                          checked={selectedArtistInDialog === artist.id}
                          onChange={(e) =>
                            setSelectedArtistInDialog(e.target.value)
                          }
                          className="w-4 h-4"
                        />
                        <label
                          htmlFor={`artist-${artist.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">
                            {artist.name}
                            {artist.verified && (
                              <span className="text-primary ml-1">✓</span>
                            )}
                          </div>
                          {artist.bio && (
                            <div className="text-sm text-muted-foreground">
                              {artist.bio}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Or create a brand new separate artist with the same name
                  (they'll be different artists in the system).
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConflictDialog(false);
                  setSelectedArtistInDialog("");
                  setConflictData(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleArtistConflictResolution("new")}
              >
                🆕 Create New Artist
              </Button>
              <Button
                onClick={() => {
                  if (selectedArtistInDialog) {
                    handleArtistConflictResolution(
                      "existing",
                      selectedArtistInDialog,
                    );
                  } else {
                    alert("Please select an existing artist first!");
                  }
                }}
              >
                ✅ Use This Existing Artist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Artist Dialog */}
        <Dialog
          open={!!editingArtist}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingArtist(null);
              setEditArtistForm({
                name: "",
                bio: "",
                website: "",
                verified: false,
                imageUrl: "",
                bannerUrl: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Artist</DialogTitle>
              <DialogDescription>
                Update artist information below
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Artist Profile Picture */}
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-sm font-medium self-start w-full">
                  Profile Picture
                </Label>
                <ImageUpload
                  currentImage={editArtistForm.imageUrl}
                  onImageChange={(url: string) =>
                    setEditArtistForm({ ...editArtistForm, imageUrl: url })
                  }
                  type="profile"
                  size="lg"
                />
              </div>

              {/* Artist Banner */}
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-sm font-medium self-start w-full">
                  Banner Image
                </Label>
                <ImageUpload
                  currentImage={editArtistForm.bannerUrl}
                  onImageChange={(url: string) =>
                    setEditArtistForm({ ...editArtistForm, bannerUrl: url })
                  }
                  type="banner"
                  size="lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist-name">Name *</Label>
                <Input
                  id="artist-name"
                  value={editArtistForm.name}
                  onChange={(e) =>
                    setEditArtistForm({
                      ...editArtistForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Artist name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist-bio">Bio</Label>
                <Textarea
                  id="artist-bio"
                  value={editArtistForm.bio}
                  onChange={(e) =>
                    setEditArtistForm({
                      ...editArtistForm,
                      bio: e.target.value,
                    })
                  }
                  placeholder="Artist biography"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist-website">Website</Label>
                <Input
                  id="artist-website"
                  value={editArtistForm.website}
                  onChange={(e) =>
                    setEditArtistForm({
                      ...editArtistForm,
                      website: e.target.value,
                    })
                  }
                  placeholder="https://artist-website.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="artist-verified"
                  checked={editArtistForm.verified}
                  onChange={(e) =>
                    setEditArtistForm({
                      ...editArtistForm,
                      verified: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="artist-verified" className="cursor-pointer">
                  Verified Artist
                </Label>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingArtist(null);
                  setEditArtistForm({
                    name: "",
                    bio: "",
                    website: "",
                    verified: false,
                    imageUrl: "",
                    bannerUrl: "",
                  });
                }}
                disabled={isUpdatingArtist}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateArtist}
                disabled={isUpdatingArtist || !editArtistForm.name.trim()}
              >
                {isUpdatingArtist ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Track Dialog */}
        <Dialog
          open={!!editingTrack}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingTrack(null);
              setEditTrackForm({
                title: "",
                genre: "",
                year: "",
                trackNumber: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Track</DialogTitle>
              <DialogDescription>Update track metadata below</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="track-title">Title *</Label>
                <Input
                  id="track-title"
                  value={editTrackForm.title}
                  onChange={(e) =>
                    setEditTrackForm({
                      ...editTrackForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="Track title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="track-genre">Genre</Label>
                  <Input
                    id="track-genre"
                    value={editTrackForm.genre}
                    onChange={(e) =>
                      setEditTrackForm({
                        ...editTrackForm,
                        genre: e.target.value,
                      })
                    }
                    placeholder="e.g., Pop, Rock, Jazz"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="track-year">Year</Label>
                  <Input
                    id="track-year"
                    type="number"
                    value={editTrackForm.year}
                    onChange={(e) =>
                      setEditTrackForm({
                        ...editTrackForm,
                        year: e.target.value,
                      })
                    }
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="track-number">Track Number</Label>
                <Input
                  id="track-number"
                  type="number"
                  value={editTrackForm.trackNumber}
                  onChange={(e) =>
                    setEditTrackForm({
                      ...editTrackForm,
                      trackNumber: e.target.value,
                    })
                  }
                  placeholder="e.g., 1"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTrack(null);
                  setEditTrackForm({
                    title: "",
                    genre: "",
                    year: "",
                    trackNumber: "",
                  });
                }}
                disabled={isUpdatingTrack}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTrack}
                disabled={isUpdatingTrack || !editTrackForm.title.trim()}
              >
                {isUpdatingTrack ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
