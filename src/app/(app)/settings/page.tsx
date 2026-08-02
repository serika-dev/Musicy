"use client";

import {
  Bell,
  Check,
  Globe,
  Languages,
  Laptop,
  Link2,
  Music,
  Palette,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Speaker,
  Trash2,
  Unlink,
  Crown,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SaveButton } from "@/components/ui/save-button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useSaveState } from "@/hooks/useSaveState";
import {
  DEFAULT_SETTINGS,
  type UserSettings,
  useSettings,
} from "@/hooks/useSettings";

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** "Active now" while it's fresh, otherwise a short relative time. */
function formatLastSeen(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return "Active now";
  if (secs < 90) return "Active a minute ago";
  if (secs < 3600) return `Active ${Math.round(secs / 60)} min ago`;
  return `Active ${Math.round(secs / 3600)} h ago`;
}

function DevicesPanel() {
  const {
    deviceId,
    devices,
    activeDeviceId,
    claimPlayback,
    isLeader,
    tabCount,
  } = useMusicPlayer();

  // Exactly one device plays at a time. Prefer the live active id; fall back to
  // the server's stored flag only if nothing else claims it — otherwise a stale
  // flag makes two rows both read "Now playing".
  const activeId =
    activeDeviceId || devices.find((d) => d.isActive)?.id || null;

  // This device first, then whatever is playing, then most-recently-seen.
  const ordered = [...devices].sort((a, b) => {
    if (a.id === deviceId) return -1;
    if (b.id === deviceId) return 1;
    if (a.id === activeId) return -1;
    if (b.id === activeId) return 1;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" /> Connected Devices
        </CardTitle>
        <CardDescription>
          Only one device plays audio at a time. Other signed-in devices act as
          remote controls — like Spotify Connect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tab info banner */}
        {tabCount > 1 && (
          <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-3">
            <div
              className={`p-1.5 rounded ${isLeader ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {isLeader ? (
                <Speaker className="w-4 h-4" />
              ) : (
                <Laptop className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {tabCount} tabs open on this device
              </div>
              <div className="text-xs text-muted-foreground">
                {isLeader
                  ? "This tab is the leader and plays audio"
                  : "This tab is a controller (leader tab plays audio)"}
              </div>
            </div>
          </div>
        )}
        {ordered.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            Looking for your devices…
          </div>
        )}
        {ordered.map((d) => {
          const isThis = d.id === deviceId;
          const isActive = d.id === activeId;
          return (
            <div
              key={d.id}
              className={`flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${
                isActive ? "border-primary/60 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`shrink-0 p-2 rounded-md ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isActive ? (
                    <Speaker className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate">{d.name}</span>
                    {isThis && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        This device
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                        <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
                        Playing
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isActive && isThis
                      ? "Playing here"
                      : isThis
                        ? "Ready to play"
                        : formatLastSeen(d.lastSeenAt)}
                  </div>
                </div>
              </div>
              {isThis && !isActive ? (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    claimPlayback();
                    toast.success("Playing here now");
                  }}
                >
                  <Play className="w-4 h-4 mr-2" /> Play here
                </Button>
              ) : !isThis && !isActive ? (
                <span className="shrink-0 text-xs text-muted-foreground text-right max-w-[9rem]">
                  Remote control
                </span>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium">{title}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    settings: savedSettings,
    updateSettingsAsync,
    hydrated,
    isSaving,
  } = useSettings();
  const save = useSaveState();

  // Settings are edited as a draft and committed explicitly, so the save
  // control has something meaningful to enable and disable against.
  const [draft, setDraft] = useState<UserSettings>(savedSettings);

  // Adopt settings whenever they change on the server — including from another
  // device. The save status is deliberately left alone: our own save applies
  // optimistically and lands here mid-flight, so clearing it would wipe out the
  // progress and confirmation the user is waiting on. It self-clears instead.
  useEffect(() => {
    setDraft(savedSettings);
  }, [savedSettings]);

  const settings = draft;
  const set = useCallback(
    (patch: Partial<UserSettings>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  const changedKeys = useMemo(
    () =>
      (Object.keys(draft) as Array<keyof UserSettings>).filter(
        (k) => draft[k] !== savedSettings[k],
      ),
    [draft, savedSettings],
  );
  const dirty = changedKeys.length > 0;

  const handleSave = () =>
    save.run(async () => {
      const patch = Object.fromEntries(
        changedKeys.map((k) => [k, draft[k]]),
      ) as Partial<UserSettings>;
      await updateSettingsAsync(patch);
    });

  const [testText, setTestText] = useState("困っちまうこれは誰かのせい");
  const [testResult, setTestResult] = useState<string>("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Apply theme setting
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (settings.theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }
  }, [settings.theme, hydrated]);

  const handleTestRomanize = async () => {
    if (!testText.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/lyrics/romanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          language:
            settings.romanizeLanguage === "auto"
              ? undefined
              : settings.romanizeLanguage,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTestResult(data.romanized);
      toast.success(
        `Romanized successfully${data.language ? ` (${data.language})` : ""}`,
      );
    } catch {
      toast.error("Failed to romanize text");
      setTestResult("");
    } finally {
      setTesting(false);
    }
  };

  // --- Serika Account linking ---
  const [serikaLink, setSerikaLink] = useState<{
    linked: boolean;
    accountId?: string;
    username?: string;
    isPremium?: boolean;
  } | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);

  const fetchSerikaLink = useCallback(async () => {
    try {
      const res = await fetch("/api/serika-account/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSerikaLink(data);
      } else {
        setSerikaLink({ linked: false });
      }
    } catch {
      setSerikaLink({ linked: false });
    } finally {
      setLinkLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSerikaLink();
  }, [fetchSerikaLink]);

  useEffect(() => {
    const result = searchParams.get("serika_link");
    if (result) {
      if (result === "success") {
        toast.success("Serika Account linked successfully!");
        fetchSerikaLink();
      } else if (result === "denied") {
        toast.error("Linking was cancelled");
      } else if (result === "invalid_state") {
        toast.error("Invalid state. Please try again.");
      } else if (result === "token_failed") {
        toast.error("Failed to get authorization token");
      } else if (result === "userinfo_failed") {
        toast.error("Failed to get account info");
      } else if (result === "error") {
        toast.error("An error occurred during linking");
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("serika_link");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, fetchSerikaLink]);

  const handleLinkSerika = () => {
    const returnUrl = `${window.location.origin}/settings`;
    window.location.href = `/api/serika-account/link?return=${encodeURIComponent(returnUrl)}`;
  };

  const handleUnlinkSerika = async () => {
    if (!confirm("Unlink your Serika Account? You will lose premium status sync.")) return;
    setUnlinking(true);
    try {
      const res = await fetch("/api/serika-account/link", { method: "DELETE" });
      if (res.ok) {
        toast.success("Serika Account unlinked");
        setSerikaLink({ linked: false });
      } else {
        toast.error("Failed to unlink");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUnlinking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    if (!confirm("Really delete your account permanently?")) return;
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted");
        router.push("/login");
      } else if (res.status === 405 || res.status === 404) {
        toast.error("Account deletion is not yet available. Contact an admin.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to delete account");
      }
    } catch {
      toast.error("Network error");
    }
  };

  if (status === "loading" || !hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Changes apply once you save them.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
            disabled={(
              Object.keys(DEFAULT_SETTINGS) as Array<keyof UserSettings>
            ).every((k) => draft[k] === DEFAULT_SETTINGS[k])}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restore defaults
          </Button>
        </div>

        <Tabs defaultValue="lyrics" className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
            <TabsTrigger value="lyrics">
              <Languages className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Lyrics</span>
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Music className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Audio</span>
            </TabsTrigger>
            <TabsTrigger value="playback">
              <Play className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Playback</span>
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Radio className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="account">
              <Link2 className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* LYRICS */}
          <TabsContent value="lyrics" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" /> Romanization
                </CardTitle>
                <CardDescription>
                  Automatic — converts Japanese, Korean, and Hindi lyrics to
                  romanized text using{" "}
                  <span className="font-mono">serika-romanizer</span>. No AI is
                  involved, so results may contain mistakes.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Auto-romanize lyrics"
                  description="Automatically romanize lyrics in supported languages while playing"
                >
                  <Switch
                    checked={settings.autoRomanizeLyrics}
                    onCheckedChange={(v) => set({ autoRomanizeLyrics: v })}
                  />
                </SettingRow>

                <SettingRow
                  title="Show original alongside romanization"
                  description="Display both original and romanized lyrics simultaneously"
                >
                  <Switch
                    checked={settings.showRomanizationAlongside}
                    onCheckedChange={(v) =>
                      set({ showRomanizationAlongside: v })
                    }
                    disabled={!settings.autoRomanizeLyrics}
                  />
                </SettingRow>

                <SettingRow
                  title="Language detection"
                  description="Choose automatic detection or force a specific language"
                >
                  <SegmentedControl
                    value={settings.romanizeLanguage}
                    onChange={(v) => set({ romanizeLanguage: v })}
                    options={[
                      { value: "auto", label: "Auto" },
                      { value: "ja", label: "JP" },
                      { value: "ko", label: "KR" },
                      { value: "hi", label: "HI" },
                    ]}
                  />
                </SettingRow>

                {/* Test Section */}
                <div className="pt-4 space-y-3">
                  <Label className="text-sm font-medium">
                    Test romanization
                  </Label>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Enter Japanese, Korean, or Hindi text..."
                    className="w-full min-h-[80px] p-3 border border-input rounded-md bg-background text-sm resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleTestRomanize}
                      disabled={testing || !testText.trim()}
                    >
                      {testing ? "Romanizing..." : "Romanize"}
                    </Button>
                    {testResult && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTestText("");
                          setTestResult("");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {testResult && (
                    <div className="p-3 bg-muted rounded-md border border-border">
                      <div className="text-xs text-muted-foreground mb-1">
                        Romanized:
                      </div>
                      <div className="text-sm font-mono">{testResult}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIO */}
          <TabsContent value="audio" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Quality</CardTitle>
                <CardDescription>
                  Control streaming quality and audio processing
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Streaming quality"
                  description="Higher quality uses more bandwidth"
                >
                  <SegmentedControl
                    value={settings.audioQuality}
                    onChange={(v) => set({ audioQuality: v })}
                    options={[
                      { value: "auto", label: "Auto" },
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Med" },
                      { value: "high", label: "High" },
                      { value: "lossless", label: "Lossless" },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  title="Volume normalization"
                  description="Level volume across all tracks for consistent loudness"
                >
                  <Switch
                    checked={settings.normalizeVolume}
                    onCheckedChange={(v) => set({ normalizeVolume: v })}
                  />
                </SettingRow>

                <div className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-medium">
                        Default volume
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Starting volume level when opening the app
                      </p>
                    </div>
                    <span className="text-sm tabular-nums font-medium">
                      {Math.round(settings.defaultVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.defaultVolume * 100]}
                    onValueChange={(v) => set({ defaultVolume: v[0] / 100 })}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-medium">Crossfade</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Smoothly blend tracks. Set to 0 to disable.
                      </p>
                    </div>
                    <span className="text-sm tabular-nums font-medium">
                      {settings.crossfadeSeconds === 0
                        ? "Off"
                        : `${settings.crossfadeSeconds}s`}
                    </span>
                  </div>
                  <Slider
                    value={[settings.crossfadeSeconds]}
                    onValueChange={(v) => set({ crossfadeSeconds: v[0] })}
                    max={12}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLAYBACK */}
          <TabsContent value="playback" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Playback</CardTitle>
                <CardDescription>Manage playback behavior</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Autoplay recommendations"
                  description="Automatically queue similar tracks when your queue ends"
                >
                  <Switch
                    checked={settings.autoplayRecommendations}
                    onCheckedChange={(v) => set({ autoplayRecommendations: v })}
                  />
                </SettingRow>

                <SettingRow
                  title="Gapless playback"
                  description="Remove silence between tracks for continuous listening"
                >
                  <Switch
                    checked={settings.gaplessPlayback}
                    onCheckedChange={(v) => set({ gaplessPlayback: v })}
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEVICES */}
          <TabsContent value="devices" className="space-y-4 mt-6">
            <DevicesPanel />
          </TabsContent>

          {/* APPEARANCE */}
          <TabsContent value="appearance" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Theme"
                  description="Choose your preferred color scheme"
                >
                  <SegmentedControl
                    value={settings.theme}
                    onChange={(v) => set({ theme: v })}
                    options={[
                      { value: "dark", label: "Dark" },
                      { value: "light", label: "Light" },
                      { value: "system", label: "System" },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  title="Reduce motion"
                  description="Minimize animations and transitions"
                >
                  <Switch
                    checked={settings.reducedMotion}
                    onCheckedChange={(v) => set({ reducedMotion: v })}
                  />
                </SettingRow>

                <SettingRow
                  title="Compact mode"
                  description="Use a denser UI with smaller padding"
                >
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(v) => set({ compactMode: v })}
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRIVACY */}
          <TabsContent value="privacy" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>
                  Control your data and visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Private session"
                  description="Don't record listening activity while enabled"
                >
                  <Switch
                    checked={settings.privateSession}
                    onCheckedChange={(v) => set({ privateSession: v })}
                  />
                </SettingRow>

                <SettingRow
                  title="Allow scrobbling"
                  description="Share playback with external scrobbling services (Last.fm, etc.)"
                >
                  <Switch
                    checked={settings.allowScrobbling}
                    onCheckedChange={(v) => set({ allowScrobbling: v })}
                  />
                </SettingRow>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/profile")}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Delete Account</h3>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SERIKA ACCOUNT */}
          <TabsContent value="account" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" /> Serika Account
                </CardTitle>
                <CardDescription>
                  Link your Serika Account to sync premium status and enable
                  cross-platform features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : serikaLink?.linked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/30">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {serikaLink.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {serikaLink.username || "Linked"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Serika Account ID: {serikaLink.accountId}
                        </div>
                      </div>
                      {serikaLink.isPremium && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 text-xs font-semibold">
                          <Crown className="w-3.5 h-3.5" />
                          Premium
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <div>
                          <div className="text-sm font-medium">Premium Status</div>
                          <div className="text-xs text-muted-foreground">
                            {serikaLink.isPremium
                              ? "Active — synced from Serika Accounts"
                              : "Not active — subscribe via accounts.serika.dev"}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          serikaLink.isPremium
                            ? "bg-green-500/15 text-green-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {serikaLink.isPremium ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleUnlinkSerika}
                      disabled={unlinking}
                      className="w-full"
                    >
                      {unlinking ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Unlink Serika Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Linking your Serika Account enables:
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Premium status sync from Serika Accounts
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Future cross-platform music syncing
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Unified login across Serika products
                      </li>
                    </ul>
                    <Button onClick={handleLinkSerika} className="w-full">
                      <Link2 className="w-4 h-4 mr-2" />
                      Link Serika Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Manage notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SettingRow
                  title="Now playing notifications"
                  description="Show a browser notification when a new track starts"
                >
                  <Switch
                    checked={settings.showNowPlayingNotifications}
                    onCheckedChange={async (v) => {
                      if (
                        v &&
                        "Notification" in window &&
                        Notification.permission !== "granted"
                      ) {
                        const perm = await Notification.requestPermission();
                        if (perm !== "granted") {
                          toast.error("Notification permission denied");
                          return;
                        }
                      }
                      set({ showNowPlayingNotifications: v });
                    }}
                  />
                </SettingRow>

                <SettingRow
                  title="New releases"
                  description="Get notified when followed artists release new music"
                >
                  <Switch
                    checked={settings.notifyOnNewReleases}
                    onCheckedChange={(v) => set({ notifyOnNewReleases: v })}
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save bar — only appears when there's something to act on, so it
            isn't sitting in the way the rest of the time. */}
        {(dirty || save.status !== "idle" || isSaving) && (
          <div className="sticky bottom-0 z-30 -mx-4 px-4 pb-2 pt-3 bg-gradient-to-t from-background via-background to-transparent animate-in slide-in-from-bottom-3 fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl px-4 py-3 shadow-lg">
              <p
                className="text-xs text-muted-foreground min-w-0"
                role="status"
              >
                {save.status === "error"
                  ? save.error
                  : save.status === "saved"
                    ? "Your settings are up to date."
                    : `${changedKeys.length} unsaved ${changedKeys.length === 1 ? "change" : "changes"}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(savedSettings)}
                  disabled={!dirty}
                >
                  Discard
                </Button>
                <SaveButton
                  // The request being in flight is the authoritative signal for
                  // showing progress; the local state machine owns the rest.
                  status={isSaving ? "saving" : save.status}
                  dirty={dirty}
                  onClick={handleSave}
                  size="sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
