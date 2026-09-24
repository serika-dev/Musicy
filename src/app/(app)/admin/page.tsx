"use client";

import {
  Album as AlbumIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Disc,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileMusic,
  FileText,
  Globe,
  Layers,
  Music,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageCropModal } from "@/components/image-crop-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminSettings } from "@/components/admin/admin-settings";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminAlbums,
  useAdminArtists,
  useAdminTracks,
  useAdminUsers,
  useDeleteAlbum,
  useDeleteTrack,
  useDeleteUser,
  useLrcLibSearch,
  useToggleTrackVisibility,
  useUpdateTrackLyrics,
  useUpdateUserRole,
} from "@/hooks/useAdminData";
import { useProfile } from "@/hooks/useProfile";
import { cn, formatDuration } from "@/lib/utils";

const ITEMS_PER_PAGE = 25;

// Avatar helper for generating colorful fallback backgrounds based on user ID or string
function getAvatarGradient(str: string = "") {
  const gradients = [
    "from-primary to-indigo-700",
    "from-pink-600 to-rose-700",
    "from-cyan-600 to-blue-700",
    "from-amber-600 to-orange-700",
    "from-emerald-600 to-teal-700",
    "from-fuchsia-600 to-violet-700",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

// Dedicated Admin Search Input component with guaranteed padding to prevent text overlap
function AdminSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none z-10" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: "2.75rem" }}
        className="bg-card border-border text-white placeholder:text-muted-foreground focus:border-primary font-medium h-10 shadow-sm"
      />
    </div>
  );
}

// Image URL or Direct File Upload component for Admin Modals with Crop Widget support
function ImageUrlOrUploadField({
  label,
  value,
  onChange,
  type = "profile",
  placeholder = "https://example.com/image.jpg",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const croppedFile = new File([croppedBlob], "cropped_image.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("type", type);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
        toast.success("Cropped image uploaded successfully!");
      } else {
        const err = await res.json();
        toast.error(`Upload failed: ${err.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Network error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

  const aspectRatio = type === "banner" ? 3 : 1;
  const isCircular = type === "profile";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground/90">{label}</Label>
        <label className="text-[11px] text-primary hover:text-primary/80 font-bold cursor-pointer flex items-center gap-1 transition-colors">
          <Upload className="w-3 h-3" />
          {isUploading ? "Uploading..." : "Upload & Crop File"}
          <input
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background/60 border-border text-xs text-white placeholder:text-muted-foreground/80 font-medium"
      />
      <ImageCropModal
        open={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={rawImageSrc}
        aspectRatio={aspectRatio}
        isCircular={isCircular}
        title={`Crop ${label}`}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

// Reusable Pagination Component
function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage = ITEMS_PER_PAGE,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-xs text-foreground/80 bg-background/60">
      <div className="font-semibold text-foreground/80">
        Showing <span className="font-bold text-white">{startItem}</span> - <span className="font-bold text-white">{endItem}</span> of{" "}
        <span className="font-bold text-white">{totalItems}</span> items (25 per page)
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 border-border bg-card hover:bg-accent text-xs gap-1 text-white font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </Button>

        <div className="flex items-center gap-1 font-bold text-white px-2">
          <span className="text-muted-foreground">Page</span>
          <span className="px-2.5 py-0.5 rounded bg-primary/30 text-primary border border-primary/40 font-mono text-xs">{currentPage}</span>
          <span className="text-muted-foreground">of {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 border-border bg-card hover:bg-accent text-xs gap-1 text-white font-medium"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState("overview");
  // Keep the section in the URL so refresh / back / shared links land on it.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t) setActiveTabState(t);
  }, []);
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, []);

  // Search states
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTracks, setSearchTracks] = useState("");
  const [trackRenditionFilter, setTrackRenditionFilter] = useState<'all' | 'ready' | 'missing' | 'failed' | 'processing'>('all');
  const [searchArtists, setSearchArtists] = useState("");
  const [artistFilter, setArtistFilter] = useState<'all' | 'collab' | 'solo'>('all');
  const [searchCollabs, setSearchCollabs] = useState("");
  const [searchAlbums, setSearchAlbums] = useState("");

  // Pagination states (25 per page)
  const [usersPage, setUsersPage] = useState(1);
  const [tracksPage, setTracksPage] = useState(1);
  const [artistsPage, setArtistsPage] = useState(1);
  const [albumsPage, setAlbumsPage] = useState(1);
  const [collabsPage, setCollabsPage] = useState(1);

  // Lyrics modal & editing state
  const [selectedTrackForLyrics, setSelectedTrackForLyrics] = useState<any>(null);
  const [manualLyricsMode, setManualLyricsMode] = useState(false);
  const [manualLyricsData, setManualLyricsData] = useState({
    lrcId: "",
    plainLyrics: "",
    syncedLyrics: "",
  });

  // Artist & Album lists for upload form dropdowns
  const [availableArtists, setAvailableArtists] = useState<any[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<any[]>([]);

  // Track upload states
  const [autoExtractMode, setAutoExtractMode] = useState(true);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [conflictData, setConflictData] = useState<any>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [selectedArtistInDialog, setSelectedArtistInDialog] = useState<string>("");

  // System Settings state
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);

  // User editing state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    username: "",
    displayName: "",
    avatarUrl: "",
    role: "USER" as "ADMIN" | "USER",
    isPremium: false,
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Artist editing state
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [editArtistForm, setEditArtistForm] = useState({
    name: "",
    altNames: "",
    bio: "",
    website: "",
    verified: false,
    imageUrl: "",
    bannerUrl: "",
  });
  const [isUpdatingArtist, setIsUpdatingArtist] = useState(false);

  // Collab editing state
  const [editingCollab, setEditingCollab] = useState<any>(null);
  const [collabForm, setCollabForm] = useState({
    bio: "",
    website: "",
    verified: false,
    imageUrl: "",
    bannerUrl: "",
  });
  const [collabMembers, setCollabMembers] = useState<any[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabTracks, setCollabTracks] = useState<any[]>([]);
  const [collabAlbums, setCollabAlbums] = useState<any[]>([]);
  const [isUpdatingCollab, setIsUpdatingCollab] = useState(false);
  const [syncFeatured, setSyncFeatured] = useState(true);

  // ===== Collab handlers =====
  const handleEditCollabClick = async (collab: any) => {
    setEditingCollab(collab);
    setCollabForm({
      bio: collab.bio || "",
      website: collab.website || "",
      verified: collab.verified || false,
      imageUrl: collab.imageUrl || "",
      bannerUrl: collab.bannerUrl || "",
    });
    setCollabMembers([]);
    setCollabTracks([]);
    setCollabAlbums([]);
    setCollabSearch("");
    setSyncFeatured(true);

    // Fetch full collab details
    try {
      const res = await fetch(`/api/admin/collabs/${collab.id}`);
      if (res.ok) {
        const data = await res.json();
        setCollabMembers(data.members || []);
        setCollabTracks(data.tracks || []);
        setCollabAlbums(data.albums || []);
        setCollabForm({
          bio: data.bio || "",
          website: data.website || "",
          verified: data.verified || false,
          imageUrl: data.imageUrl || "",
          bannerUrl: data.bannerUrl || "",
        });
      }
    } catch (e) {
      console.error("Error fetching collab details:", e);
    }
  };

  const addCollabMember = (artist: any) => {
    if (collabMembers.find(m => m.id === artist.id)) return;
    setCollabMembers([...collabMembers, artist]);
    setCollabSearch("");
  };

  const removeCollabMember = (memberId: string) => {
    setCollabMembers(collabMembers.filter(m => m.id !== memberId));
  };

  const collabMemberNames = collabMembers.length > 0
    ? collabMembers.map(m => m.name).join(', ')
    : '';

  const filteredAvailableArtists = availableArtists
    .filter(a => !collabMembers.find(m => m.id === a.id))
    .filter(a => !(a.isCollab === true || (a.isCollab === null && a.name?.includes(' & '))))
    .filter(a => collabSearch ? a.name.toLowerCase().includes(collabSearch.toLowerCase()) : true)
    .slice(0, 10);

  const handleUpdateCollab = async () => {
    if (!editingCollab) return;
    if (collabMembers.length < 2) {
      toast.error("A collaboration needs at least 2 artists");
      return;
    }

    setIsUpdatingCollab(true);
    try {
      const response = await fetch(`/api/admin/collabs/${editingCollab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...collabForm,
          memberIds: collabMembers.map(m => m.id),
          syncFeatured,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        toast.success(`Collaboration "${updated.name}" updated successfully!`);
        setEditingCollab(null);
        refetchArtists();
        refetchCollabs();
      } else {
        const error = await response.json();
        toast.error(`Failed to update collaboration: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating collab:", error);
      toast.error("Failed to update collaboration: Network error");
    } finally {
      setIsUpdatingCollab(false);
    }
  };

  // Track editing state
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [editTrackForm, setEditTrackForm] = useState({
    title: "",
    genre: "",
    year: "",
    trackNumber: "",
    artistId: "",
    albumId: "",
    coverImageUrl: "",
    isPublic: true,
  });
  const [isUpdatingTrack, setIsUpdatingTrack] = useState(false);

  // Album editing state
  const [editingAlbum, setEditingAlbum] = useState<any>(null);
  const [editAlbumForm, setEditAlbumForm] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    genre: "",
    albumType: "ALBUM",
    isPublic: true,
    releaseDate: "",
    artistId: "",
  });
  const [isUpdatingAlbum, setIsUpdatingAlbum] = useState(false);

  // Album merge state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeDuplicates, setMergeDuplicates] = useState<any[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  // Artist merge state
  const [showArtistMergeDialog, setShowArtistMergeDialog] = useState(false);
  const [artistMergeDuplicates, setArtistMergeDuplicates] = useState<any[]>([]);
  const [isMergingArtists, setIsMergingArtists] = useState(false);

  // Track merge state
  const [showTrackMergeDialog, setShowTrackMergeDialog] = useState(false);
  const [trackMergeDuplicates, setTrackMergeDuplicates] = useState<any[]>([]);
  const [isMergingTracks, setIsMergingTracks] = useState(false);

  // Rendition backfill state
  const [renditionStats, setRenditionStats] = useState<any>(null);
  const [renditionLoading, setRenditionLoading] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);

  // Upload form data
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

  // Data queries with 25 items per page limit & offset calculation
  const { data: usersData, refetch: refetchUsers } = useAdminUsers(
    searchUsers,
    ITEMS_PER_PAGE,
    (usersPage - 1) * ITEMS_PER_PAGE,
  );
  const { data: tracksData, refetch: refetchTracks } = useAdminTracks(
    searchTracks,
    ITEMS_PER_PAGE,
    (tracksPage - 1) * ITEMS_PER_PAGE,
    trackRenditionFilter,
  );
  const { data: artistsData, refetch: refetchArtists } = useAdminArtists(
    searchArtists,
    ITEMS_PER_PAGE,
    (artistsPage - 1) * ITEMS_PER_PAGE,
    artistFilter,
  );
  const { data: collabsData, refetch: refetchCollabs } = useAdminArtists(
    searchCollabs,
    ITEMS_PER_PAGE,
    (collabsPage - 1) * ITEMS_PER_PAGE,
    'collab',
  );
  const { data: albumsData, refetch: refetchAlbums } = useAdminAlbums(
    searchAlbums,
    ITEMS_PER_PAGE,
    (albumsPage - 1) * ITEMS_PER_PAGE,
  );

  // Mutation hooks
  const deleteTrack = useDeleteTrack();
  const deleteUser = useDeleteUser();
  const deleteAlbum = useDeleteAlbum();
  const updateUserRole = useUpdateUserRole();
  const toggleTrackVisibility = useToggleTrackVisibility();
  const searchLyrics = useLrcLibSearch();
  const updateTrackLyrics = useUpdateTrackLyrics();

  // Redirect non-admins
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

  // Load available artists and albums for upload dropdowns
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

  // Load rendition stats when renditions tab is active, and auto-poll while backfill is running
  useEffect(() => {
    if (activeTab !== "renditions") return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const loadRenditionStats = async () => {
      try {
        const res = await fetch("/api/admin/renditions");
        if (res.ok) {
          const data = await res.json();
          setRenditionStats(data);
          // Keep polling while any tracks are in "processing" or "pending" state
          const active = (data.coverage?.processing ?? 0) + (data.coverage?.pending ?? 0);
          if (active > 0 && !interval) {
            interval = setInterval(loadRenditionStats, 3000);
          } else if (active === 0 && interval) {
            clearInterval(interval);
            interval = undefined;
          }
        }
      } catch (e) {
        console.error("Error loading rendition stats:", e);
      }
    };
    setRenditionLoading(true);
    loadRenditionStats().finally(() => setRenditionLoading(false));
    return () => { if (interval) clearInterval(interval); };
  }, [activeTab]);

  // Load system settings on mount
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

    loadSettings();
  }, []);

  const handleUpdateSystemSetting = async (key: string, value: string) => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        toast.success("Setting saved");
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

  // Auto-fetch lyrics when LRC ID is typed in upload form
  useEffect(() => {
    const fetchLyricsById = async () => {
      if (uploadFormData.lrcId && !uploadFormData.plainLyrics) {
        try {
          const response = await fetch(`https://lrclib.net/api/get/${uploadFormData.lrcId}`);
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

  // Handle automatic metadata extraction from audio file
  const handleExtractMetadata = async (file: File) => {
    if (!file || !autoExtractMode) return;

    setIsExtracting(true);
    setExtractedMetadata(null);

    try {
      const formData = new FormData();
      formData.append("audioFile", file);
      formData.append("extractMetadata", "true");

      const response = await fetch("/api/admin/upload/track-auto", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const metadata = result.extractedMetadata;

        if (metadata) {
          setExtractedMetadata(metadata);
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
        toast.success(`Metadata extracted: ${metadata.title} by ${metadata.artist}`);
      } else if (response.status === 409) {
        const error = await response.json();

        if (error.error === "ARTIST_CONFLICT") {
          setConflictData(error);
          setExtractedMetadata(error.extractedMetadata);
          setSelectedArtistInDialog(error.conflictingArtists?.[0]?.id || "");
          setShowConflictDialog(true);

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
          toast.error(`Metadata extraction failed: ${error.message}`);
        }
      } else {
        const error = await response.json();
        toast.error(`Metadata extraction failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Metadata extraction error:", error);
      toast.error("Metadata extraction failed: Network error");
    }

    setIsExtracting(false);
  };

  // Handle Track Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFormData.audioFile) {
      toast.error("Audio file is required");
      return;
    }

    if (!autoExtractMode && (!uploadFormData.title || !uploadFormData.artistName)) {
      toast.error("In manual mode, title and artist name are required");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Preparing upload...");

    const formData = new FormData();

    if (autoExtractMode) {
      formData.append("extractMetadata", "true");
    }

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
          toast.success(`Track "${result.track.title}" uploaded successfully!`);

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
          setConflictData(error);
          setSelectedArtistInDialog(error.conflictingArtists?.[0]?.id || "");
          setShowConflictDialog(true);
          setUploadProgress("Artist name conflict detected - please choose an option");
        } else {
          toast.error(`Upload failed: ${error.message}`);
          setIsUploading(false);
          setUploadProgress("");
        }
      } else {
        const error = await response.json();
        toast.error(`Upload failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message || "Network error"}`);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // User editing handlers
  const handleEditUserClick = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      username: user.username || "",
      displayName: user.displayName || "",
      avatarUrl: user.avatarUrl || "",
      role: user.role || "USER",
      isPremium: user.isPremium || false,
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      await updateUserRole.mutateAsync({
        userId: editingUser.id,
        role: editUserForm.role,
        isPremium: editUserForm.isPremium,
        displayName: editUserForm.displayName,
        username: editUserForm.username,
        avatarUrl: editUserForm.avatarUrl,
      });

      setEditingUser(null);
      refetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Artist editing handlers
  const handleEditArtistClick = (artist: any) => {
    setEditingArtist(artist);
    setEditArtistForm({
      name: artist.name || "",
      altNames: Array.isArray(artist.altNames) ? artist.altNames.join(", ") : "",
      bio: artist.bio || "",
      website: artist.website || "",
      verified: artist.verified || false,
      imageUrl: artist.imageUrl || "",
      bannerUrl: artist.bannerUrl || "",
    });
  };

  const handleUpdateArtist = async () => {
    if (!editingArtist) return;

    setIsUpdatingArtist(true);
    try {
      const response = await fetch(`/api/admin/artists/${editingArtist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editArtistForm,
          altNames: editArtistForm.altNames
            ? editArtistForm.altNames.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
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

  const handleDeleteArtist = async (artistId: string, artistName: string) => {
    if (!confirm(`Delete artist "${artistName}"? This will also remove their associated tracks and albums.`)) {
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

  // Track editing handlers
  const handleEditTrackClick = async (track: any) => {
    setEditingTrack(track);
    setEditTrackForm({
      title: track.title || "",
      genre: track.genre || "",
      year: track.year ? String(track.year) : "",
      trackNumber: track.trackNumber ? String(track.trackNumber) : "",
      artistId: track.artist?.id || "",
      albumId: track.album?.id || "",
      coverImageUrl: track.coverImageUrl || "",
      isPublic: track.isPublic ?? true,
    });
    // Load artists and albums for dropdowns if not already loaded
    if (availableArtists.length === 0) {
      try {
        const response = await fetch("/api/admin/artists-list");
        if (response.ok) {
          const data = await response.json();
          setAvailableArtists(data.artists || []);
        }
      } catch (error) {
        console.error("Error loading artists:", error);
      }
    }
    if (availableAlbums.length === 0) {
      try {
        const response = await fetch("/api/admin/albums-list");
        if (response.ok) {
          const data = await response.json();
          setAvailableAlbums(data.albums || []);
        }
      } catch (error) {
        console.error("Error loading albums:", error);
      }
    }
  };

  const handleUpdateTrack = async () => {
    if (!editingTrack) return;

    setIsUpdatingTrack(true);
    try {
      const response = await fetch(`/api/admin/tracks/${editingTrack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTrackForm.title,
          genre: editTrackForm.genre || null,
          year: editTrackForm.year ? parseInt(editTrackForm.year) : null,
          trackNumber: editTrackForm.trackNumber ? parseInt(editTrackForm.trackNumber) : null,
          artistId: editTrackForm.artistId || undefined,
          albumId: editTrackForm.albumId || null,
          coverImageUrl: editTrackForm.coverImageUrl || null,
          isPublic: editTrackForm.isPublic,
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

  // Album editing handlers
  const handleEditAlbumClick = async (album: any) => {
    setEditingAlbum(album);
    setEditAlbumForm({
      title: album.title || "",
      description: album.description || "",
      coverImageUrl: album.coverImageUrl || "",
      genre: album.genre || "",
      albumType: album.albumType || "ALBUM",
      isPublic: album.isPublic ?? true,
      releaseDate: album.releaseDate ? new Date(album.releaseDate).toISOString().split('T')[0] : "",
      artistId: album.artist?.id || "",
    });
    // Load artists for dropdown if not already loaded
    if (availableArtists.length === 0) {
      try {
        const response = await fetch("/api/admin/artists-list");
        if (response.ok) {
          const data = await response.json();
          setAvailableArtists(data.artists || []);
        }
      } catch (error) {
        console.error("Error loading artists:", error);
      }
    }
  };

  const handleUpdateAlbum = async () => {
    if (!editingAlbum) return;

    setIsUpdatingAlbum(true);
    try {
      const response = await fetch(`/api/admin/albums/${editingAlbum.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editAlbumForm,
          releaseDate: editAlbumForm.releaseDate || null,
          artistId: editAlbumForm.artistId || undefined,
        }),
      });

      if (response.ok) {
        toast.success(`Album "${editAlbumForm.title}" updated successfully!`);
        setEditingAlbum(null);
        refetchAlbums();
      } else {
        const error = await response.json();
        toast.error(`Failed to update album: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating album:", error);
      toast.error("Failed to update album: Network error");
    } finally {
      setIsUpdatingAlbum(false);
    }
  };

  // ===== Artist merge handlers =====
  const handleScanDuplicateArtists = async () => {
    setIsMergingArtists(true);
    try {
      const res = await fetch('/api/admin/artists/merge');
      if (res.ok) {
        const data = await res.json();
        setArtistMergeDuplicates(data.duplicates || []);
        setShowArtistMergeDialog(true);
        if (data.duplicates.length === 0) {
          toast.success("No duplicate artists found!");
        } else {
          toast.info(`Found ${data.totalGroups} artist group(s) with duplicates (${data.totalArtistsToMerge} artists to merge)`);
        }
      } else {
        toast.error("Failed to scan for duplicate artists");
      }
    } catch (e) {
      toast.error("Failed to scan for duplicate artists");
    } finally {
      setIsMergingArtists(false);
    }
  };

  const handleMergeArtist = async (sourceId: string, targetId: string) => {
    setIsMergingArtists(true);
    try {
      const res = await fetch('/api/admin/artists/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceArtistId: sourceId, targetArtistId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        // Remove the merged group from the list
        setArtistMergeDuplicates(prev => prev.filter(g => !g.artists.some((a: any) => a.id === sourceId)));
        refetchArtists();
        refetchTracks();
        refetchAlbums();
      } else {
        const err = await res.json();
        toast.error(`Failed to merge: ${err.message}`);
      }
    } catch (e) {
      toast.error("Failed to merge artists");
    } finally {
      setIsMergingArtists(false);
    }
  };

  const handleMergeAllArtists = async () => {
    setIsMergingArtists(true);
    let merged = 0;
    for (const group of artistMergeDuplicates) {
      if (group.artists.length < 2) continue;
      const targetId = group.artists[0].id;
      for (let i = 1; i < group.artists.length; i++) {
        try {
          const res = await fetch('/api/admin/artists/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceArtistId: group.artists[i].id, targetArtistId: targetId }),
          });
          if (res.ok) merged++;
        } catch (e) {
          console.error(`Failed to merge artist:`, e);
        }
      }
    }
    toast.success(`Merged ${merged} artist(s) successfully!`);
    setArtistMergeDuplicates([]);
    setShowArtistMergeDialog(false);
    refetchArtists();
    refetchTracks();
    refetchAlbums();
    setIsMergingArtists(false);
  };

  // ===== Track merge handlers =====
  const handleScanDuplicateTracks = async () => {
    setIsMergingTracks(true);
    try {
      const res = await fetch('/api/admin/tracks/merge');
      if (res.ok) {
        const data = await res.json();
        setTrackMergeDuplicates(data.duplicates || []);
        setShowTrackMergeDialog(true);
        if (data.duplicates.length === 0) {
          toast.success("No duplicate tracks found!");
        } else {
          toast.info(`Found ${data.totalGroups} track group(s) with duplicates (${data.totalTracksToMerge} tracks to merge)`);
        }
      } else {
        toast.error("Failed to scan for duplicate tracks");
      }
    } catch (e) {
      toast.error("Failed to scan for duplicate tracks");
    } finally {
      setIsMergingTracks(false);
    }
  };

  const handleMergeTrack = async (sourceId: string, targetId: string) => {
    setIsMergingTracks(true);
    try {
      const res = await fetch('/api/admin/tracks/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTrackId: sourceId, targetTrackId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        // Remove the merged group from the list
        setTrackMergeDuplicates(prev => prev.filter(g => !g.tracks.some((t: any) => t.id === sourceId)));
        refetchTracks();
      } else {
        const err = await res.json();
        toast.error(`Failed to merge: ${err.message}`);
      }
    } catch (e) {
      toast.error("Failed to merge tracks");
    } finally {
      setIsMergingTracks(false);
    }
  };

  const handleMergeAllTracks = async () => {
    setIsMergingTracks(true);
    let merged = 0;
    for (const group of trackMergeDuplicates) {
      if (group.tracks.length < 2) continue;
      const targetId = group.tracks[0].id;
      for (let i = 1; i < group.tracks.length; i++) {
        try {
          const res = await fetch('/api/admin/tracks/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceTrackId: group.tracks[i].id, targetTrackId: targetId }),
          });
          if (res.ok) merged++;
        } catch (e) {
          console.error(`Failed to merge track:`, e);
        }
      }
    }
    toast.success(`Merged ${merged} track(s) successfully!`);
    setTrackMergeDuplicates([]);
    setShowTrackMergeDialog(false);
    refetchTracks();
    setIsMergingTracks(false);
  };

  // ===== Album merge handlers =====
  const handleScanDuplicateAlbums = async () => {
    setIsMerging(true);
    try {
      const res = await fetch('/api/admin/albums/merge');
      if (res.ok) {
        const data = await res.json();
        setMergeDuplicates(data.duplicates || []);
        setShowMergeDialog(true);
        if (data.duplicates.length === 0) {
          toast.success("No duplicate albums found!");
        } else {
          toast.info(`Found ${data.totalDuplicateTitles} album title(s) with duplicates (${data.totalAlbumsToMerge} albums to merge)`);
        }
      } else {
        toast.error("Failed to scan for duplicates");
      }
    } catch (e) {
      toast.error("Failed to scan for duplicates");
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeAlbum = async (albumTitle: string) => {
    setIsMerging(true);
    try {
      const res = await fetch('/api/admin/albums/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        // Remove from list
        setMergeDuplicates(prev => prev.filter(g => g.title.toLowerCase() !== albumTitle.toLowerCase()));
        refetchAlbums();
      } else {
        const err = await res.json();
        toast.error(`Failed to merge: ${err.message}`);
      }
    } catch (e) {
      toast.error("Failed to merge albums");
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeAllDuplicates = async () => {
    setIsMerging(true);
    let merged = 0;
    for (const dup of mergeDuplicates) {
      try {
        const res = await fetch('/api/admin/albums/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ albumTitle: dup.title }),
        });
        if (res.ok) {
          merged++;
        }
      } catch (e) {
        console.error(`Failed to merge ${dup.title}:`, e);
      }
    }
    toast.success(`Merged ${merged} album group(s) successfully!`);
    setMergeDuplicates([]);
    setShowMergeDialog(false);
    refetchAlbums();
    setIsMerging(false);
  };

  // Lyrics search & update handlers
  const handleSearchLyrics = async (track: any) => {
    try {
      const result = await searchLyrics.mutateAsync({
        artist: track.artist.name,
        track: track.title,
      });

      if (result.found && result.data) {
        const lrcData = Array.isArray(result.data) ? result.data[0] : result.data;
        if (lrcData && (lrcData.plainLyrics || lrcData.syncedLyrics)) {
          setSelectedTrackForLyrics({ ...track, lrcData });
          setManualLyricsMode(false);
          toast.success("Lyrics found on LRCLib!");
        } else {
          setSelectedTrackForLyrics(track);
          setManualLyricsMode(true);
          setManualLyricsData({ lrcId: "", plainLyrics: "", syncedLyrics: "" });
          toast.info("Lyrics record found, but no text available. Ready for manual input.");
        }
      } else {
        setSelectedTrackForLyrics(track);
        setManualLyricsMode(true);
        setManualLyricsData({ lrcId: "", plainLyrics: "", syncedLyrics: "" });
        toast.info("No automatic lyrics match found. Switched to manual lyrics editor.");
      }
    } catch (error) {
      setSelectedTrackForLyrics(track);
      setManualLyricsMode(true);
      setManualLyricsData({ lrcId: "", plainLyrics: "", syncedLyrics: "" });
      toast.error("Lyrics search encountered an error. Opened manual editor.");
    }
  };

  const handleUpdateLyrics = async () => {
    if (!selectedTrackForLyrics) return;

    try {
      if (manualLyricsMode) {
        await updateTrackLyrics.mutateAsync({
          trackId: selectedTrackForLyrics.id,
          lrcId: manualLyricsData.lrcId ? parseInt(manualLyricsData.lrcId) : undefined,
          plainLyrics: manualLyricsData.plainLyrics || undefined,
          syncedLyrics: manualLyricsData.syncedLyrics || undefined,
        });
      } else {
        await updateTrackLyrics.mutateAsync({
          trackId: selectedTrackForLyrics.id,
          lrcId: selectedTrackForLyrics.lrcData?.id,
          plainLyrics: selectedTrackForLyrics.lrcData?.plainLyrics,
          syncedLyrics: selectedTrackForLyrics.lrcData?.syncedLyrics,
        });
      }

      toast.success("Lyrics updated successfully!");
      setSelectedTrackForLyrics(null);
      setManualLyricsMode(false);
      setManualLyricsData({ lrcId: "", plainLyrics: "", syncedLyrics: "" });
      refetchTracks();
    } catch (error) {
      console.error("Error updating lyrics:", error);
      toast.error("Failed to update lyrics");
    }
  };

  if (status === "loading" || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Verifying administrator permissions...
        </p>
      </div>
    );
  }

  if (!session || !profile || profile.role !== "ADMIN") {
    return (
      <EmptyState
        icon={<Crown className="h-10 w-10 text-primary" />}
        title="Access Restricted"
        description="The admin panel is reserved exclusively for system administrators."
        action={
          <Button onClick={() => router.push("/")} className="bg-primary hover:bg-primary/90 text-white font-semibold">
            Return to Music Player
          </Button>
        }
      />
    );
  }

  const navGroups: {
    label: string;
    items: { value: string; label: string; icon: typeof Layers; count?: number; description: string }[];
  }[] = [
    {
      label: "",
      items: [
        { value: "overview", label: "Overview", icon: Layers, description: "Listening, growth and system health at a glance." },
      ],
    },
    {
      label: "Catalogue",
      items: [
        { value: "tracks", label: "Tracks", icon: Music, count: tracksData?.total, description: "Edit metadata, lyrics and visibility, and merge duplicates." },
        { value: "albums", label: "Albums", icon: AlbumIcon, count: albumsData?.total, description: "Releases, artwork and track order." },
        { value: "artists", label: "Artists", icon: UserIcon, count: artistsData?.total, description: "Profiles, verification and duplicate merging." },
        { value: "collabs", label: "Collabs", icon: Users, count: collabsData?.total, description: "Group acts and the members they credit." },
      ],
    },
    {
      label: "Ingest",
      items: [
        { value: "upload", label: "Upload", icon: Upload, description: "Add new music. Tags are read from the file automatically." },
        { value: "renditions", label: "Renditions", icon: FileMusic, description: "Streaming quality tiers transcoded from each master." },
      ],
    },
    {
      label: "Platform",
      items: [
        { value: "users", label: "Users", icon: Users, count: usersData?.total, description: "Accounts, roles and premium status." },
        { value: "settings", label: "Settings", icon: Settings, description: "Registration, maintenance, branding and defaults." },
      ],
    },
  ];
  const allNavItems = navGroups.flatMap((g) => g.items);
  const currentSection = allNavItems.find((i) => i.value === activeTab) ?? allNavItems[0];

  return (
    <div className="w-full pb-20">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{currentSection.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentSection.description}</p>
        </div>
        <Button
          onClick={() => setActiveTab("upload")}
          className="h-10 shrink-0 rounded-full px-5 font-semibold hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Upload music
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8"
      >
        {/* Section nav: grouped list on desktop, scrolling chips on phones */}
        <nav aria-label="Admin sections" className="-mx-4 mb-6 lg:sticky lg:top-0 lg:mx-0 lg:mb-0">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:hidden">
            {allNavItems.map((item) => (
              <button
                key={item.value}
                type="button"
                className="chip"
                data-active={activeTab === item.value}
                aria-current={activeTab === item.value ? "page" : undefined}
                onClick={() => setActiveTab(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="hidden space-y-5 lg:block">
            {navGroups.map((group) => (
              <div key={group.label || "top"}>
                {group.label && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const on = activeTab === item.value;
                    return (
                      <li key={item.value}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(item.value)}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            on ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-panel-hover hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.count !== undefined && (
                            <span className="text-xs tabular-nums text-muted-foreground">{item.count.toLocaleString("en")}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-0">
          <AdminOverview
            recentUsers={usersData?.users ?? []}
            onNavigate={setActiveTab}
            onEditUser={handleEditUserClick}
          />
        </TabsContent>

        {/* 🎵 RENDITIONS TAB */}
        <TabsContent value="renditions" className="mt-0 space-y-6">
          {/* Stats + Actions */}
          <Card className="bg-raised border-0 shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <FileMusic className="w-5 h-5 text-primary" />
                Multi-Quality Audio Renditions
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">Transcoded streaming tiers (lossless FLAC + 320/192/128 kbps MP3)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {renditionStats ? (
                <>
                  {/* Coverage stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-background/60 border border-emerald-500/30">
                      <span className="text-muted-foreground block mb-1 font-semibold">Ready</span>
                      <span className="font-bold text-emerald-400 text-lg">{renditionStats.coverage?.ready ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/60 border border-amber-500/30">
                      <span className="text-muted-foreground block mb-1 font-semibold">Processing</span>
                      <span className="font-bold text-amber-400 text-lg">{renditionStats.coverage?.processing ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/60 border border-blue-500/30">
                      <span className="text-muted-foreground block mb-1 font-semibold">Pending</span>
                      <span className="font-bold text-blue-400 text-lg">{renditionStats.coverage?.pending ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/60 border border-rose-500/30">
                      <span className="text-muted-foreground block mb-1 font-semibold">Failed</span>
                      <span className="font-bold text-rose-400 text-lg">{renditionStats.coverage?.failed ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/60 border border-border">
                      <span className="text-muted-foreground block mb-1 font-semibold">No Renditions</span>
                      <span className="font-bold text-white text-lg">{renditionStats.coverage?.none ?? 0}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const total = renditionStats.total || 1;
                    const ready = renditionStats.coverage?.ready ?? 0;
                    const processing = renditionStats.coverage?.processing ?? 0;
                    const pending = renditionStats.coverage?.pending ?? 0;
                    const failed = renditionStats.coverage?.failed ?? 0;
                    const done = ready + failed;
                    const active = processing + pending;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground/80">
                            {active > 0 ? `Processing… ${done}/${total} done` : `Complete: ${ready}/${total} ready`}
                          </span>
                          <span className="font-bold text-white">{pct}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-background/60 border border-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {active > 0 && (
                          <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Auto-refreshing every 3s while tracks are being processed…
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Summary row */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Total tracks:</span> <span className="font-bold text-white">{renditionStats.total}</span>
                      <span className="mx-2">·</span>
                      <span className="font-semibold">Renditions:</span> <span className="font-bold text-white">{renditionStats.totalRenditions}</span>
                    </div>
                    {renditionStats.byQuality && Object.keys(renditionStats.byQuality).length > 0 && (
                      <div className="flex gap-2">
                        {Object.entries(renditionStats.byQuality).map(([q, n]) => (
                          <Badge key={q} className="bg-primary/15 text-primary border-primary/40 text-[10px] font-bold">{q}: {n as number}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      disabled={backfillRunning || (renditionStats.coverage?.none ?? 0) + (renditionStats.coverage?.failed ?? 0) + (renditionStats.coverage?.pending ?? 0) === 0}
                      onClick={async () => {
                        setBackfillRunning(true);
                        try {
                          const res = await fetch("/api/admin/renditions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                          if (res.ok) {
                            const data = await res.json();
                            toast.success(data.message);
                            // Immediately re-fetch stats to start polling
                            const statRes = await fetch("/api/admin/renditions");
                            if (statRes.ok) setRenditionStats(await statRes.json());
                          } else {
                            toast.error("Failed to start backfill");
                          }
                        } catch {
                          toast.error("Network error");
                        } finally {
                          setBackfillRunning(false);
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5"
                    >
                      {backfillRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Backfill Missing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={backfillRunning}
                      onClick={async () => {
                        setBackfillRunning(true);
                        try {
                          const res = await fetch("/api/admin/renditions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }) });
                          if (res.ok) {
                            const data = await res.json();
                            toast.success(data.message);
                            const statRes = await fetch("/api/admin/renditions");
                            if (statRes.ok) setRenditionStats(await statRes.json());
                          } else {
                            toast.error("Failed to start full regeneration");
                          }
                        } catch {
                          toast.error("Network error");
                        } finally {
                          setBackfillRunning(false);
                        }
                      }}
                      className="border-border bg-card hover:bg-accent text-white font-semibold gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate All
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        setRenditionLoading(true);
                        try {
                          const res = await fetch("/api/admin/renditions");
                          if (res.ok) setRenditionStats(await res.json());
                        } finally {
                          setRenditionLoading(false);
                        }
                      }}
                      className="text-muted-foreground hover:text-white font-semibold gap-1.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${renditionLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground/80 py-2">Loading rendition stats…</div>
              )}
            </CardContent>
          </Card>

          {/* What are renditions? Info card */}
          <Card className="bg-raised border-0 shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold text-white">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground leading-relaxed">
              <p>Each track is transcoded into multiple quality tiers on upload using <span className="font-bold text-white">ffmpeg</span>:</p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-center gap-2"><Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] font-bold">lossless</Badge> FLAC — bit-for-bit identical to source</li>
                <li className="flex items-center gap-2"><Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold">high</Badge> MP3 320 kbps</li>
                <li className="flex items-center gap-2"><Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">medium</Badge> MP3 192 kbps</li>
                <li className="flex items-center gap-2"><Badge className="bg-secondary text-foreground/80 border-border text-[10px] font-bold">low</Badge> MP3 128 kbps</li>
              </ul>
              <p className="pt-1">Mobile clients pick a tier via the <code className="text-primary bg-background/60 px-1.5 py-0.5 rounded text-[11px]">audioQuality</code> setting and stream through <code className="text-primary bg-background/60 px-1.5 py-0.5 rounded text-[11px]">/api/tracks/&#123;id&#125;/stream?quality=</code>, which 302-redirects to the matching rendition (falling back to the original when none exists).</p>
              <p className="pt-1"><span className="font-bold text-amber-400">Backfill Missing</span> generates renditions for tracks with no, failed, or pending status. <span className="font-bold text-white">Regenerate All</span> force-regenerates every track, even those already marked ready.</p>
              <p className="pt-1 text-muted-foreground/80">Processing runs sequentially in the background via Next.js <code className="text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded text-[11px]">after()</code>. The progress bar auto-refreshes every 3 seconds while tracks are being processed.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 👥 USERS MANAGEMENT TAB (25 per page) */}
        <TabsContent value="users" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <AdminSearchInput
              value={searchUsers}
              onChange={(val) => {
                setSearchUsers(val);
                setUsersPage(1);
              }}
              placeholder="Search users by name or email..."
            />
            <Button variant="outline" size="sm" onClick={() => refetchUsers()} className="border-border bg-card hover:bg-accent text-white font-semibold gap-2 shrink-0 h-10 px-4">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh List
            </Button>
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-foreground/90">User Profile</TableHead>
                    <TableHead className="font-bold text-foreground/90">Role</TableHead>
                    <TableHead className="font-bold text-foreground/90">Subscription</TableHead>
                    <TableHead className="font-bold text-foreground/90">Playlists</TableHead>
                    <TableHead className="font-bold text-foreground/90">Joined</TableHead>
                    <TableHead className="font-bold text-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users?.map((user: any) => (
                    <TableRow key={user.id} className="border-border hover:bg-panel-hover transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border shrink-0">
                            <AvatarImage src={user.avatarUrl} alt={user.displayName || user.email} />
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(user.id)} text-white font-bold text-xs`}>
                              {(user.displayName?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm text-white">{user.displayName || user.username || "User"}</div>
                            <div className="text-xs text-muted-foreground font-medium">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"} className="font-bold text-xs">
                          {user.role === "ADMIN" ? <Shield className="w-3 h-3 mr-1" /> : null}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isPremium ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 gap-1 font-bold">
                            <Crown className="w-3 h-3 text-amber-400" /> PRO
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">Free Tier</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80 font-bold">
                        {user._count?.playlists || 0} playlists
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditUserClick(user)} className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={user.id === session?.user?.id}
                            onClick={() => {
                              if (confirm(`Delete account for "${user.email}"?`)) {
                                deleteUser.mutate(user.id);
                              }
                            }}
                            className="h-8 text-xs font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <PaginationControls
                currentPage={usersPage}
                totalItems={usersData?.total || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setUsersPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🎵 TRACKS MANAGEMENT TAB (25 per page) */}
        <TabsContent value="tracks" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <AdminSearchInput
              value={searchTracks}
              onChange={(val) => {
                setSearchTracks(val);
                setTracksPage(1);
              }}
              placeholder="Search tracks by title, artist, genre..."
            />
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleScanDuplicateTracks} disabled={isMergingTracks} className="border-primary/40 bg-primary/10 hover:bg-primary/10 text-primary font-semibold gap-2 h-10 px-4">
                <Music className={cn("h-3.5 w-3.5", isMergingTracks && "animate-spin")} /> Merge Duplicates
              </Button>
              <Button onClick={() => setActiveTab("upload")} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 shrink-0 h-10 px-4">
                <Plus className="w-4 h-4" /> Add Track
              </Button>
            </div>
          </div>

          {/* Rendition filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1">Renditions:</span>
            {([
              { value: 'all', label: 'All' },
              { value: 'ready', label: 'Has Renditions' },
              { value: 'missing', label: 'Missing' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setTrackRenditionFilter(value); setTracksPage(1); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  trackRenditionFilter === value
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-card border-border text-muted-foreground hover:text-white hover:border-foreground/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-foreground/90">Track Title</TableHead>
                    <TableHead className="font-bold text-foreground/90">Artist & Album</TableHead>
                    <TableHead className="font-bold text-foreground/90">Format & Quality</TableHead>
                    <TableHead className="font-bold text-foreground/90">Duration</TableHead>
                    <TableHead className="font-bold text-foreground/90">Renditions</TableHead>
                    <TableHead className="font-bold text-foreground/90">Lyrics Status</TableHead>
                    <TableHead className="font-bold text-foreground/90">Visibility</TableHead>
                    <TableHead className="font-bold text-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracksData?.tracks?.map((track: any) => (
                    <TableRow key={track.id} className="border-border hover:bg-panel-hover transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-background/60 border border-border flex items-center justify-center shrink-0">
                            {track.album?.coverImageUrl ? (
                              <img src={track.album.coverImageUrl} alt={track.title} className="h-full w-full object-cover" />
                            ) : (
                              <Music className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{track.title}</div>
                            <div className="text-xs text-muted-foreground font-medium">{track.genre || "No Genre"} {track.year ? `• ${track.year}` : ""}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-bold text-primary flex items-center gap-1.5">
                          {track.artist.name}
                          {track.artist.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium truncate max-w-[180px]">{track.album?.title || "Single"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] font-bold">
                          {track.format || "FLAC"} {track.bitRate ? `${Math.round(track.bitRate / 1000)}k` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80 font-mono font-bold">
                        {formatDuration(track.duration)}
                      </TableCell>
                      <TableCell>
                        {track.renditionStatus === 'ready' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">Ready</Badge>
                        ) : track.renditionStatus === 'processing' ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">Processing</Badge>
                        ) : track.renditionStatus === 'pending' ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold">Pending</Badge>
                        ) : track.renditionStatus === 'failed' ? (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-bold">Failed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-semibold">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {track.syncedLyrics ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">Synced LRC</Badge>
                        ) : track.plainLyrics ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold">Plain Lyrics</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-semibold">No Lyrics</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={track.isPublic ? "default" : "secondary"} className={track.isPublic ? "bg-emerald-600 text-white font-bold" : "font-bold"}>
                          {track.isPublic ? "Public" : "Private"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => handleEditTrackClick(track)} className="h-8 w-8 p-0 border-border bg-background/60 hover:bg-accent text-white" title="Edit Metadata">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleTrackVisibility.mutate({ trackId: track.id, isPublic: !track.isPublic })} className="h-8 w-8 p-0 border-border bg-background/60 hover:bg-accent text-white" title="Toggle Public Status">
                            {track.isPublic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSearchLyrics(track)} className="h-8 w-8 p-0 border-border bg-background/60 hover:bg-primary/20 hover:text-primary/80 text-white" title="Manage Lyrics">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => confirm(`Delete track "${track.title}"?`) && deleteTrack.mutate(track.id)} className="h-8 w-8 p-0 font-bold" title="Delete Track">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <PaginationControls
                currentPage={tracksPage}
                totalItems={tracksData?.total || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setTracksPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🎤 ARTISTS MANAGEMENT TAB */}
        <TabsContent value="artists" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <AdminSearchInput
              value={searchArtists}
              onChange={(val) => {
                setSearchArtists(val);
                setArtistsPage(1);
              }}
              placeholder="Search artists by name..."
            />
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <Button
                variant={artistFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setArtistFilter('all'); setArtistsPage(1); }}
                className="h-10 px-3 text-xs font-bold"
              >
                All
              </Button>
              <Button
                variant={artistFilter === 'solo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setArtistFilter('solo'); setArtistsPage(1); }}
                className="h-10 px-3 text-xs font-bold"
              >
                Solo
              </Button>
              <Button
                variant={artistFilter === 'collab' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setArtistFilter('collab'); setArtistsPage(1); }}
                className="h-10 px-3 text-xs font-bold"
              >
                Collabs
              </Button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleScanDuplicateArtists} disabled={isMergingArtists} className="border-cyan-600/40 bg-cyan-950/30 hover:bg-cyan-900/30 text-cyan-300 font-semibold gap-2 h-10 px-4">
                <Users className={cn("h-3.5 w-3.5", isMergingArtists && "animate-spin")} /> Merge Duplicates
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchArtists()} className="border-border bg-card hover:bg-accent text-white font-semibold gap-2 shrink-0 h-10 px-4">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh List
              </Button>
            </div>
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-foreground/90">Artist Profile</TableHead>
                    <TableHead className="font-bold text-foreground/90">Status</TableHead>
                    <TableHead className="font-bold text-foreground/90">Tracks</TableHead>
                    <TableHead className="font-bold text-foreground/90">Albums</TableHead>
                    <TableHead className="font-bold text-foreground/90">Bio / Website</TableHead>
                    <TableHead className="font-bold text-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistsData?.artists?.map((artist: any) => (
                    <TableRow key={artist.id} className="border-border hover:bg-panel-hover transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border shrink-0 shadow-sm">
                            <AvatarImage src={artist.imageUrl} alt={artist.name} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-white font-bold text-xs">
                              {artist.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              {artist.name}
                              {artist.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                              {(artist.isCollab === true || (artist.isCollab === null && artist.name?.includes(' & '))) && (
                                <Badge className="bg-primary/15 text-primary border-primary/40 text-[8px] font-bold py-0 px-1.5 uppercase">Collab</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {artist.verified ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 gap-1 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-blue-400" /> VERIFIED
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-semibold">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground/90">{artist._count?.tracks || 0} tracks</TableCell>
                      <TableCell className="text-xs font-bold text-foreground/90">{artist._count?.albums || 0} albums</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                          {artist.bio || "No bio set"}
                        </div>
                        {artist.website && (
                          <a href={artist.website} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5 font-semibold">
                            <Globe className="w-2.5 h-2.5" /> Website
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(artist.isCollab === true || (artist.isCollab === null && artist.name?.includes(' & '))) && (
                            <Button variant="outline" size="sm" asChild className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                              <a href={`/collabs/${artist.id}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEditArtistClick(artist)} className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                            <Edit className="w-3.5 h-3.5" /> Edit Profile
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteArtist(artist.id, artist.name)} className="h-8 text-xs font-bold">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <PaginationControls
                currentPage={artistsPage}
                totalItems={artistsData?.total || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setArtistsPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🤝 COLLABORATIONS MANAGEMENT TAB */}
        <TabsContent value="collabs" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <AdminSearchInput
              value={searchCollabs}
              onChange={(val) => {
                setSearchCollabs(val);
                setCollabsPage(1);
              }}
              placeholder="Search collaborations..."
            />
            <Button variant="outline" size="sm" onClick={() => refetchCollabs()} className="border-border bg-card hover:bg-accent text-white font-semibold gap-2 shrink-0 h-10 px-4">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh List
            </Button>
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-foreground/90">Collaboration</TableHead>
                    <TableHead className="font-bold text-foreground/90">Status</TableHead>
                    <TableHead className="font-bold text-foreground/90">Tracks</TableHead>
                    <TableHead className="font-bold text-foreground/90">Albums</TableHead>
                    <TableHead className="font-bold text-foreground/90">Bio</TableHead>
                    <TableHead className="font-bold text-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collabsData?.artists?.map((collab: any) => (
                    <TableRow key={collab.id} className="border-border hover:bg-panel-hover transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border shrink-0 shadow-sm">
                            <AvatarImage src={collab.imageUrl} alt={collab.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-violet-800 text-white font-bold text-xs">
                              {collab.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              {collab.name}
                              {collab.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                              <Badge className="bg-primary/15 text-primary border-primary/40 text-[8px] font-bold py-0 px-1.5 uppercase">Collab</Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {collab.verified ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 gap-1 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-blue-400" /> VERIFIED
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-semibold">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground/90">{collab._count?.tracks || 0} tracks</TableCell>
                      <TableCell className="text-xs font-bold text-foreground/90">{collab._count?.albums || 0} albums</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                          {collab.bio || "No bio set"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                            <a href={`/collabs/${collab.id}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditCollabClick(collab)} className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteArtist(collab.id, collab.name)} className="h-8 text-xs font-bold">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <PaginationControls
                currentPage={collabsPage}
                totalItems={collabsData?.total || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCollabsPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 💿 ALBUMS MANAGEMENT TAB (25 per page) */}
        <TabsContent value="albums" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <AdminSearchInput
              value={searchAlbums}
              onChange={(val) => {
                setSearchAlbums(val);
                setAlbumsPage(1);
              }}
              placeholder="Search albums..."
            />
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleScanDuplicateAlbums} disabled={isMerging} className="border-amber-600/40 bg-amber-950/30 hover:bg-amber-900/30 text-amber-300 font-semibold gap-2 h-10 px-4">
                <Disc className={cn("h-3.5 w-3.5", isMerging && "animate-spin")} /> Merge Duplicates
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchAlbums()} className="border-border bg-card hover:bg-accent text-white font-semibold gap-2 h-10 px-4">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh List
              </Button>
            </div>
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold text-foreground/90">Album</TableHead>
                    <TableHead className="font-bold text-foreground/90">Artist</TableHead>
                    <TableHead className="font-bold text-foreground/90">Type</TableHead>
                    <TableHead className="font-bold text-foreground/90">Tracks</TableHead>
                    <TableHead className="font-bold text-foreground/90">Created</TableHead>
                    <TableHead className="font-bold text-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {albumsData?.albums?.map((album: any) => (
                    <TableRow key={album.id} className="border-border hover:bg-panel-hover transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-background/60 border border-border flex items-center justify-center shrink-0">
                            {album.coverImageUrl ? (
                              <img src={album.coverImageUrl} alt={album.title} className="h-full w-full object-cover" />
                            ) : (
                              <AlbumIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="font-bold text-sm text-white">{album.title}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-primary">
                        {album.artist?.name || "Unknown Artist"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] font-bold">
                          {album.albumType || "ALBUM"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80 font-bold">
                        {album._count?.tracks || 0} tracks
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {new Date(album.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditAlbumClick(album)} className="h-8 border-border bg-background/60 hover:bg-accent gap-1 text-xs text-white font-semibold">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete album "${album.title}"?`)) {
                                deleteAlbum.mutate(album.id);
                              }
                            }}
                            className="h-8 text-xs font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <PaginationControls
                currentPage={albumsPage}
                totalItems={albumsData?.total || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setAlbumsPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📤 UPLOAD TRACK TAB */}
        <TabsContent value="upload" className="mt-0 space-y-6">
          <Card className="bg-raised border-0 shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Audio & Track Uploader
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Upload high-resolution music files with real-time automatic ID3 metadata extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Mode Selector */}
              <div className="flex flex-col gap-4 p-4 rounded-xl bg-background/60 border border-border sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setAutoExtractMode(true)}>
                  <input type="radio" checked={autoExtractMode} onChange={() => setAutoExtractMode(true)} className="accent-primary h-4 w-4" />
                  <Label className="cursor-pointer font-bold text-white text-sm">Automatic Metadata Extraction (Recommended)</Label>
                </div>
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setAutoExtractMode(false)}>
                  <input type="radio" checked={!autoExtractMode} onChange={() => setAutoExtractMode(false)} className="accent-primary h-4 w-4" />
                  <Label className="cursor-pointer font-semibold text-foreground/80 text-sm">Manual Entry</Label>
                </div>
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="audioFile" className="text-white font-bold text-sm">Audio File (FLAC, WAV, MP3) *</Label>
                    <Input
                      id="audioFile"
                      type="file"
                      accept=".flac,.wav,.mp3,.alac,.m4a"
                      onChange={async (e) => {
                        const file = e.target.files?.[0] || null;
                        setUploadFormData({ ...uploadFormData, audioFile: file });
                        if (file && autoExtractMode) {
                          await handleExtractMetadata(file);
                        }
                      }}
                      required
                      className="bg-background/60 border-border text-white h-11"
                    />
                    {isExtracting && (
                      <p className="text-xs text-primary animate-pulse font-bold">🔄 Parsing ID3 & Audio Tags...</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coverImage" className="text-white font-bold text-sm">Cover Image (Optional)</Label>
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadFormData({ ...uploadFormData, coverImage: e.target.files?.[0] || null })}
                      className="bg-background/60 border-border text-white h-11"
                    />
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-white font-bold text-sm">Track Title *</Label>
                    <Input
                      id="title"
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                      placeholder="e.g. Midnight City"
                      required
                      className="bg-background/60 border-border text-white font-medium placeholder:text-muted-foreground/80 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre" className="text-white font-bold text-sm">Genre</Label>
                    <Input
                      id="genre"
                      value={uploadFormData.genre}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, genre: e.target.value })}
                      placeholder="e.g. Synthwave"
                      className="bg-background/60 border-border text-white font-medium placeholder:text-muted-foreground/80 h-10"
                    />
                  </div>
                </div>

                {/* Artist selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white font-bold text-sm">Select Existing Artist</Label>
                    <select
                      value={uploadFormData.selectedArtistId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const artist = availableArtists.find((a) => a.id === selectedId);
                        setUploadFormData({
                          ...uploadFormData,
                          selectedArtistId: selectedId,
                          artistName: artist?.name || "",
                        });
                      }}
                      className="w-full h-10 rounded-md bg-background/60 border border-border px-3 text-sm text-white font-medium focus:border-primary"
                    >
                      <option value="">Select artist...</option>
                      {availableArtists.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} {a.verified ? "✓" : ""}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-bold text-sm">Or New Artist Name *</Label>
                    <Input
                      value={uploadFormData.artistName}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, artistName: e.target.value, selectedArtistId: "" })}
                      placeholder="e.g. M83"
                      className="bg-background/60 border-border text-white font-medium placeholder:text-muted-foreground/80 h-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 text-base shadow-lg shadow-primary/20"
                >
                  {isUploading ? (uploadProgress || "Uploading...") : "Publish Track to Platform"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ⚙️ SYSTEM SETTINGS TAB */}
        <TabsContent value="settings" className="mt-0">
          <AdminSettings
            settings={systemSettings}
            onSave={handleUpdateSystemSetting}
            refreshing={isSettingsLoading}
            onRefresh={async () => {
              setIsSettingsLoading(true);
              try {
                const res = await fetch("/api/admin/settings");
                if (res.ok) {
                  const data = await res.json();
                  setSystemSettings(data.settings || {});
                }
              } catch {
                toast.error("Failed to reload settings");
              } finally {
                setIsSettingsLoading(false);
              }
            }}
          />
        </TabsContent>
        </div>
      </Tabs>

      {/* ✏️ USER EDITOR DIALOG */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              Edit User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify account role, premium status, and display properties for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-background/60 border border-border">
              <Avatar className="h-14 w-14 border-2 border-primary/40 shadow-lg shrink-0">
                <AvatarImage src={editUserForm.avatarUrl} />
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(editingUser?.id)} text-white font-bold text-base`}>
                  {(editUserForm.displayName?.charAt(0) || editingUser?.email?.charAt(0) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <ImageUrlOrUploadField
                  label="Avatar Image"
                  value={editUserForm.avatarUrl}
                  onChange={(url) => setEditUserForm({ ...editUserForm, avatarUrl: url })}
                  type="profile"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Display Name</Label>
                <Input
                  value={editUserForm.displayName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Username</Label>
                <Input
                  value={editUserForm.username}
                  onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Role Privilege</Label>
                <p className="text-xs text-muted-foreground font-medium">Grant administrator rights</p>
              </div>
              <select
                value={editUserForm.role}
                onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as "ADMIN" | "USER" })}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:border-primary"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Premium Subscription</Label>
                <p className="text-xs text-muted-foreground font-medium">Unlock 24-bit FLAC & offline downloads</p>
              </div>
              <Switch
                checked={editUserForm.isPremium}
                onCheckedChange={(val) => setEditUserForm({ ...editUserForm, isPremium: val })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEditingUser(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isUpdatingUser} className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🎤 ARTIST EDITOR DIALOG */}
      <Dialog open={!!editingArtist} onOpenChange={(open) => !open && setEditingArtist(null)}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              {(editingArtist?.isCollab === true || (editingArtist?.isCollab === null && editingArtist?.name?.includes(' & '))) ? 'Edit Collaboration' : 'Edit Artist Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update artist metadata, images, and verification status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-background/60 border border-border">
              <Avatar className="h-14 w-14 border-2 border-amber-500/40 shadow-lg shrink-0">
                <AvatarImage src={editArtistForm.imageUrl} alt={editArtistForm.name} />
                <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-white font-bold text-lg">
                  {(editArtistForm.name?.charAt(0) || "A").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <ImageUrlOrUploadField
                  label="Avatar Image"
                  value={editArtistForm.imageUrl}
                  onChange={(url) => setEditArtistForm({ ...editArtistForm, imageUrl: url })}
                  type="profile"
                  placeholder="https://example.com/artist.jpg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Artist Name *</Label>
              <Input
                value={editArtistForm.name}
                onChange={(e) => setEditArtistForm({ ...editArtistForm, name: e.target.value })}
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Alternate / Romanized Names</Label>
              <Input
                value={editArtistForm.altNames}
                onChange={(e) => setEditArtistForm({ ...editArtistForm, altNames: e.target.value })}
                placeholder="e.g. Hoshimachi Suisei, Suisei (comma-separated)"
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
              <p className="text-[10px] text-muted-foreground/80">Comma-separated names users can search by (romanized, English, etc.)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Biography</Label>
              <Textarea
                value={editArtistForm.bio}
                onChange={(e) => setEditArtistForm({ ...editArtistForm, bio: e.target.value })}
                rows={3}
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ImageUrlOrUploadField
                label="Banner Image"
                value={editArtistForm.bannerUrl}
                onChange={(url) => setEditArtistForm({ ...editArtistForm, bannerUrl: url })}
                type="banner"
                placeholder="https://example.com/banner.jpg"
              />

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Website Link</Label>
                <Input
                  value={editArtistForm.website}
                  onChange={(e) => setEditArtistForm({ ...editArtistForm, website: e.target.value })}
                  placeholder="https://..."
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Verified Artist Checkmark</Label>
                <p className="text-xs text-muted-foreground font-medium">Show official blue badge on platform</p>
              </div>
              <Switch
                checked={editArtistForm.verified}
                onCheckedChange={(val) => setEditArtistForm({ ...editArtistForm, verified: val })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEditingArtist(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button onClick={handleUpdateArtist} disabled={isUpdatingArtist} className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg">
              {(editingArtist?.isCollab === true || (editingArtist?.isCollab === null && editingArtist?.name?.includes(' & '))) ? 'Save Collaboration' : 'Save Artist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🤝 COLLAB EDITOR DIALOG */}
      <Dialog open={!!editingCollab} onOpenChange={(open) => !open && setEditingCollab(null)}>
        <DialogContent className="bg-card border border-border text-white w-[95vw] max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Edit Collaboration
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage collaboration members and metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Preview name */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <Label className="text-[10px] font-bold text-primary uppercase tracking-wider">Collaboration Name</Label>
              <p className="text-lg font-bold text-white mt-1">
                {editingCollab?.name || "Loading..."}
              </p>
              {collabMemberNames && (
                <p className="text-xs text-primary/70 font-medium mt-1">
                  Members: {collabMemberNames}
                </p>
              )}
            </div>

            {/* Member artists management */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground/90">Member Artists *</Label>

              {/* Current members */}
              {collabMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {collabMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-lg bg-secondary border border-border"
                    >
                      <Avatar className="h-6 w-6 border border-foreground/20">
                        <AvatarImage src={member.imageUrl} alt={member.name} />
                        <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-white">{member.name}</span>
                      {member.verified && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                        onClick={() => removeCollabMember(member.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search to add members */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                  <Input
                    value={collabSearch}
                    onChange={(e) => setCollabSearch(e.target.value)}
                    placeholder="Search artists to add as members..."
                    className="bg-background/60 border-border text-xs text-white font-medium pl-9"
                  />
                </div>
                {collabSearch && filteredAvailableArtists.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg bg-secondary border border-border shadow-2xl max-h-48 overflow-y-auto">
                    {filteredAvailableArtists.map((artist) => (
                      <button
                        key={artist.id}
                        onClick={() => addCollabMember(artist)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/15 transition-colors text-left"
                      >
                        <Avatar className="h-6 w-6 border border-foreground/20">
                          <AvatarImage src={artist.imageUrl} alt={artist.name} />
                          <AvatarFallback className="bg-accent text-white text-[10px] font-bold">
                            {artist.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-white">{artist.name}</span>
                        {artist.verified && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                        <Plus className="w-3.5 h-3.5 text-primary ml-auto" />
                      </button>
                    ))}
                  </div>
                )}
                {collabSearch && filteredAvailableArtists.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg bg-secondary border border-border shadow-2xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">No solo artists found. Try a different search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sync featured checkbox */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Sync Featured Artists</Label>
                <p className="text-xs text-muted-foreground font-medium">Update all collab tracks/albums to feature the member artists</p>
              </div>
              <Switch
                checked={syncFeatured}
                onCheckedChange={setSyncFeatured}
              />
            </div>

            {/* Avatar + Banner */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-background/60 border border-border">
              <Avatar className="h-14 w-14 border-2 border-primary/40 shadow-lg shrink-0">
                <AvatarImage src={collabForm.imageUrl} alt="Collab" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet-800 text-white font-bold text-lg">
                  {(editingCollab?.name?.charAt(0) || "C").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <ImageUrlOrUploadField
                  label="Avatar Image"
                  value={collabForm.imageUrl}
                  onChange={(url) => setCollabForm({ ...collabForm, imageUrl: url })}
                  type="profile"
                  placeholder="https://example.com/collab.jpg"
                />
              </div>
            </div>

            <ImageUrlOrUploadField
              label="Banner Image"
              value={collabForm.bannerUrl}
              onChange={(url) => setCollabForm({ ...collabForm, bannerUrl: url })}
              type="banner"
              placeholder="https://example.com/banner.jpg"
            />

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Collaboration Bio</Label>
              <Textarea
                value={collabForm.bio}
                onChange={(e) => setCollabForm({ ...collabForm, bio: e.target.value })}
                rows={3}
                className="bg-background/60 border-border text-xs text-white font-medium"
                placeholder="Describe this collaboration..."
              />
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Website Link</Label>
              <Input
                value={collabForm.website}
                onChange={(e) => setCollabForm({ ...collabForm, website: e.target.value })}
                placeholder="https://..."
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            {/* Verified */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Verified Badge</Label>
                <p className="text-xs text-muted-foreground font-medium">Show official blue badge on platform</p>
              </div>
              <Switch
                checked={collabForm.verified}
                onCheckedChange={(val) => setCollabForm({ ...collabForm, verified: val })}
              />
            </div>

            {/* Tracks & Albums summary */}
            {(collabTracks.length > 0 || collabAlbums.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-white">Tracks ({collabTracks.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {collabTracks.slice(0, 8).map((track) => (
                      <div key={track.id} className="text-[10px] text-muted-foreground font-medium truncate">
                        {track.title} {track.playCount > 0 && `• ${track.playCount} plays`}
                      </div>
                    ))}
                    {collabTracks.length > 8 && (
                      <div className="text-[10px] text-muted-foreground/80">+{collabTracks.length - 8} more...</div>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <AlbumIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-white">Albums ({collabAlbums.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {collabAlbums.slice(0, 8).map((album) => (
                      <div key={album.id} className="text-[10px] text-muted-foreground font-medium truncate">
                        {album.title} • {album.albumType}
                      </div>
                    ))}
                    {collabAlbums.length > 8 && (
                      <div className="text-[10px] text-muted-foreground/80">+{collabAlbums.length - 8} more...</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEditingCollab(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button
              onClick={handleUpdateCollab}
              disabled={isUpdatingCollab || collabMembers.length < 2}
              className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg disabled:opacity-50"
            >
              {isUpdatingCollab ? "Saving..." : "Save Collaboration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🎵 TRACK EDITOR DIALOG */}
      <Dialog open={!!editingTrack} onOpenChange={(open) => !open && setEditingTrack(null)}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Edit Track Metadata
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update track details, artist, album, and visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Track Title *</Label>
              <Input
                value={editTrackForm.title}
                onChange={(e) => setEditTrackForm({ ...editTrackForm, title: e.target.value })}
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Artist *</Label>
              <select
                value={editTrackForm.artistId}
                onChange={(e) => setEditTrackForm({ ...editTrackForm, artistId: e.target.value })}
                className="w-full h-9 bg-background/60 border border-border rounded-md px-3 text-xs text-white font-bold"
              >
                <option value="">Select artist...</option>
                {availableArtists.map((artist: any) => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Album</Label>
              <select
                value={editTrackForm.albumId}
                onChange={(e) => setEditTrackForm({ ...editTrackForm, albumId: e.target.value })}
                className="w-full h-9 bg-background/60 border border-border rounded-md px-3 text-xs text-white font-bold"
              >
                <option value="">No album (single)</option>
                {availableAlbums.map((album: any) => (
                  <option key={album.id} value={album.id}>{album.title} — {album.artist?.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Genre</Label>
                <Input
                  value={editTrackForm.genre}
                  onChange={(e) => setEditTrackForm({ ...editTrackForm, genre: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Year</Label>
                <Input
                  type="number"
                  value={editTrackForm.year}
                  onChange={(e) => setEditTrackForm({ ...editTrackForm, year: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Track #</Label>
                <Input
                  type="number"
                  value={editTrackForm.trackNumber}
                  onChange={(e) => setEditTrackForm({ ...editTrackForm, trackNumber: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
            </div>

            <ImageUrlOrUploadField
              label="Cover Image (optional, overrides album cover)"
              value={editTrackForm.coverImageUrl}
              onChange={(url) => setEditTrackForm({ ...editTrackForm, coverImageUrl: url })}
              type="playlist"
              placeholder="https://example.com/cover.jpg"
            />

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Public Visibility</Label>
                <p className="text-xs text-muted-foreground font-medium">Visible to all users when enabled</p>
              </div>
              <Switch
                checked={editTrackForm.isPublic}
                onCheckedChange={(val) => setEditTrackForm({ ...editTrackForm, isPublic: val })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEditingTrack(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button onClick={handleUpdateTrack} disabled={isUpdatingTrack} className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg">
              Save Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 💿 ALBUM EDITOR DIALOG */}
      <Dialog open={!!editingAlbum} onOpenChange={(open) => !open && setEditingAlbum(null)}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <AlbumIcon className="w-5 h-5 text-primary" />
              Edit Album Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update album metadata, artist, release date, and visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Album Title *</Label>
              <Input
                value={editAlbumForm.title}
                onChange={(e) => setEditAlbumForm({ ...editAlbumForm, title: e.target.value })}
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Artist *</Label>
              <select
                value={editAlbumForm.artistId}
                onChange={(e) => setEditAlbumForm({ ...editAlbumForm, artistId: e.target.value })}
                className="w-full h-9 bg-background/60 border border-border rounded-md px-3 text-xs text-white font-bold"
              >
                <option value="">Select artist...</option>
                {availableArtists.map((artist: any) => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground/90">Description</Label>
              <Textarea
                value={editAlbumForm.description}
                onChange={(e) => setEditAlbumForm({ ...editAlbumForm, description: e.target.value })}
                rows={2}
                className="bg-background/60 border-border text-xs text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ImageUrlOrUploadField
                label="Cover Image"
                value={editAlbumForm.coverImageUrl}
                onChange={(url) => setEditAlbumForm({ ...editAlbumForm, coverImageUrl: url })}
                type="playlist"
                placeholder="https://example.com/cover.jpg"
              />

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Album Type</Label>
                <select
                  value={editAlbumForm.albumType}
                  onChange={(e) => setEditAlbumForm({ ...editAlbumForm, albumType: e.target.value })}
                  className="w-full h-9 bg-background/60 border border-border rounded-md px-3 text-xs text-white font-bold"
                >
                  <option value="ALBUM">ALBUM</option>
                  <option value="EP">EP</option>
                  <option value="SINGLE">SINGLE</option>
                  <option value="COMPILATION">COMPILATION</option>
                  <option value="MIXTAPE">MIXTAPE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Genre</Label>
                <Input
                  value={editAlbumForm.genre}
                  onChange={(e) => setEditAlbumForm({ ...editAlbumForm, genre: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground/90">Release Date</Label>
                <Input
                  type="date"
                  value={editAlbumForm.releaseDate}
                  onChange={(e) => setEditAlbumForm({ ...editAlbumForm, releaseDate: e.target.value })}
                  className="bg-background/60 border-border text-xs text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white">Public Visibility</Label>
                <p className="text-xs text-muted-foreground font-medium">Visible to all users when enabled</p>
              </div>
              <Switch
                checked={editAlbumForm.isPublic}
                onCheckedChange={(val) => setEditAlbumForm({ ...editAlbumForm, isPublic: val })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setEditingAlbum(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button onClick={handleUpdateAlbum} disabled={isUpdatingAlbum} className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg">
              Save Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 💿 ALBUM MERGE DIALOG */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="bg-card border border-border text-white w-[95vw] max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Disc className="w-5 h-5 text-amber-400" />
              Merge Duplicate Albums
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review and merge albums with duplicate titles. Tracks are moved to the oldest album.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {mergeDuplicates.length === 0 ? (
              <div className="text-center py-8">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">No duplicate albums found!</p>
                <p className="text-xs text-muted-foreground mt-1">All albums have unique titles.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                  <div>
                    <p className="text-sm font-bold text-amber-300">
                      {mergeDuplicates.length} album title(s) with duplicates
                    </p>
                    <p className="text-xs text-amber-400/70 mt-0.5">
                      Merging moves all tracks to the oldest album and deletes duplicates.
                    </p>
                  </div>
                  <Button
                    onClick={handleMergeAllDuplicates}
                    disabled={isMerging}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0"
                  >
                    {isMerging ? "Merging..." : "Merge All"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {mergeDuplicates.map((group, gi) => (
                    <div key={gi} className="rounded-xl bg-background/60 border border-border overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <div>
                          <p className="text-sm font-bold text-white">{group.title}</p>
                          <p className="text-[10px] text-muted-foreground/80">{group.albums.length} copies found</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMergeAlbum(group.title)}
                          disabled={isMerging}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-8"
                        >
                          Merge
                        </Button>
                      </div>
                      <div className="divide-y divide-border">
                        {group.albums.map((album: any, ai: number) => (
                          <div key={album.id} className="flex items-center gap-3 px-3 py-2">
                            <div className="w-8 h-8 rounded bg-secondary overflow-hidden shrink-0">
                              {album.coverImageUrl && (
                                <img src={album.coverImageUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{album.artist.name}</p>
                              <p className="text-[10px] text-muted-foreground/80">{album.tracks} tracks</p>
                            </div>
                            {ai === 0 && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/40 text-[8px] font-bold uppercase">Keep</Badge>
                            )}
                            {ai > 0 && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[8px] font-bold uppercase">Delete</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} className="border-border bg-card text-white hover:bg-accent font-semibold">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🎤 ARTIST MERGE DIALOG */}
      <Dialog open={showArtistMergeDialog} onOpenChange={setShowArtistMergeDialog}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Merge Duplicate Artists
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Found {artistMergeDuplicates.length} group(s) of duplicate artists. The first artist in each group (most tracks) is the merge target. Merging moves all tracks, albums, follows, and collab members to the target, then deletes the duplicate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
            {artistMergeDuplicates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No duplicate artists found!</div>
            ) : (
              artistMergeDuplicates.map((group: any, gi: number) => (
                <div key={gi} className="p-4 rounded-xl bg-background/60 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Group {gi + 1} — {group.artists.length} artists</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetId = group.artists[0].id;
                        for (let i = 1; i < group.artists.length; i++) {
                          handleMergeArtist(group.artists[i].id, targetId);
                        }
                      }}
                      disabled={isMergingArtists}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-7 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Merge All in Group
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {group.artists.map((artist: any, ai: number) => (
                      <div key={artist.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
                          {artist.imageUrl ? (
                            <img src={artist.imageUrl} alt={artist.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-muted-foreground/80" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{artist.name}</span>
                            {ai === 0 && (
                              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px] font-bold py-0 px-1.5">TARGET</Badge>
                            )}
                            {artist.verified && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground/80 font-medium">
                            {artist.tracks} tracks • {artist.albums} albums • {artist.followers} followers
                            {artist.altNames?.length > 0 && ` • alt: ${artist.altNames.join(", ")}`}
                          </div>
                        </div>
                        {ai > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMergeArtist(artist.id, group.artists[0].id)}
                            disabled={isMergingArtists}
                            className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50 font-bold text-[10px] h-7 px-2 gap-1 shrink-0"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Merge into target
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setShowArtistMergeDialog(false)} className="border-border bg-card text-white hover:bg-accent font-semibold">Close</Button>
            {artistMergeDuplicates.length > 0 && (
              <Button
                onClick={handleMergeAllArtists}
                disabled={isMergingArtists}
                className="bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg gap-2"
              >
                {isMergingArtists ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Merge All ({artistMergeDuplicates.reduce((acc: number, g: any) => acc + g.artists.length - 1, 0)} artists)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🎵 TRACK MERGE DIALOG */}
      <Dialog open={showTrackMergeDialog} onOpenChange={setShowTrackMergeDialog}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Merge Duplicate Tracks
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Found {trackMergeDuplicates.length} group(s) of duplicate tracks. The first track in each group (most plays) is the merge target. Merging combines play counts, moves all likes/playlists/history to the target, then deletes the duplicate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
            {trackMergeDuplicates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No duplicate tracks found!</div>
            ) : (
              trackMergeDuplicates.map((group: any, gi: number) => (
                <div key={gi} className="p-4 rounded-xl bg-background/60 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Group {gi + 1} — {group.tracks.length} tracks</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetId = group.tracks[0].id;
                        for (let i = 1; i < group.tracks.length; i++) {
                          handleMergeTrack(group.tracks[i].id, targetId);
                        }
                      }}
                      disabled={isMergingTracks}
                      className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-7 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Merge All in Group
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {group.tracks.map((track: any, ti: number) => (
                      <div key={track.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                        <div className="h-9 w-9 rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
                          {track.album?.coverImageUrl ? (
                            <img src={track.album.coverImageUrl} alt={track.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Music className="h-4 w-4 text-muted-foreground/80" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{track.title}</span>
                            {ti === 0 && (
                              <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] font-bold py-0 px-1.5">TARGET</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground/80 font-medium">
                            {track.artist.name} • {track.format} {track.bitRate ? `${track.bitRate}kbps` : ""} • {track.playCount} plays
                            {track.album ? ` • ${track.album.title}` : ""}
                          </div>
                        </div>
                        {ti > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMergeTrack(track.id, group.tracks[0].id)}
                            disabled={isMergingTracks}
                            className="text-primary hover:text-primary/80 hover:bg-primary/10 font-bold text-[10px] h-7 px-2 gap-1 shrink-0"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Merge into target
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setShowTrackMergeDialog(false)} className="border-border bg-card text-white hover:bg-accent font-semibold">Close</Button>
            {trackMergeDuplicates.length > 0 && (
              <Button
                onClick={handleMergeAllTracks}
                disabled={isMergingTracks}
                className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg gap-2"
              >
                {isMergingTracks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Merge All ({trackMergeDuplicates.reduce((acc: number, g: any) => acc + g.tracks.length - 1, 0)} tracks)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📜 LYRICS EDITOR DIALOG */}
      <Dialog open={!!selectedTrackForLyrics} onOpenChange={(open) => !open && setSelectedTrackForLyrics(null)}>
        <DialogContent className="bg-card border border-border text-white w-[calc(100vw-1.5rem)] max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Lyrics Editor: {selectedTrackForLyrics?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Edit plain and synced lyrics, including romanized versions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border">
              <span className="text-xs font-bold text-foreground/80">Editor Mode</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={!manualLyricsMode ? "default" : "outline"}
                  onClick={() => setManualLyricsMode(false)}
                  className="h-8 text-xs font-bold text-white"
                >
                  LRCLib Match
                </Button>
                <Button
                  size="sm"
                  variant={manualLyricsMode ? "default" : "outline"}
                  onClick={() => setManualLyricsMode(true)}
                  className="h-8 text-xs font-bold text-white"
                >
                  Manual Text / LRC
                </Button>
              </div>
            </div>

            {manualLyricsMode ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">Synced Lyrics (LRC Format with [mm:ss.xx])</Label>
                  <Textarea
                    value={manualLyricsData.syncedLyrics}
                    onChange={(e) => setManualLyricsData({ ...manualLyricsData, syncedLyrics: e.target.value })}
                    rows={6}
                    placeholder="[00:12.00] First line of song..."
                    className="font-mono text-xs bg-background/60 border-border text-white font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">Plain Text Lyrics</Label>
                  <Textarea
                    value={manualLyricsData.plainLyrics}
                    onChange={(e) => setManualLyricsData({ ...manualLyricsData, plainLyrics: e.target.value })}
                    rows={4}
                    placeholder="Plain lyrics without timestamps..."
                    className="text-xs bg-background/60 border-border text-white font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background/60 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">LRCLib Lyrics Found</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">Auto Synced</Badge>
                </div>
                <div className="max-h-60 overflow-y-auto font-mono text-xs text-foreground/80 p-3.5 rounded-lg bg-card border border-border leading-relaxed">
                  {selectedTrackForLyrics?.lrcData?.syncedLyrics || selectedTrackForLyrics?.lrcData?.plainLyrics || "No lyrics content in match."}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setSelectedTrackForLyrics(null)} className="border-border bg-card text-white hover:bg-accent font-semibold">Cancel</Button>
            <Button onClick={handleUpdateLyrics} className="bg-primary hover:bg-primary/90 font-bold text-white shadow-lg">
              Save Lyrics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
