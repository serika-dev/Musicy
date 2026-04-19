"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useSettings, DEFAULT_SETTINGS } from "@/hooks/useSettings"
import { useMusicPlayer } from "@/contexts/music-player-context"
import {
  Bell,
  Shield,
  Palette,
  Music,
  Languages,
  RotateCcw,
  Play,
  Trash2,
  Globe,
  Check,
  Laptop,
  Speaker,
  Radio,
} from "lucide-react"

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1">
      {options.map(opt => (
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
  )
}

function DevicesPanel() {
  const { deviceId, deviceName, devices, activeDeviceId, claimPlayback, tabId, isLeader, tabCount } = useMusicPlayer()

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
            <div className={`p-1.5 rounded ${isLeader ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {isLeader ? <Speaker className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
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
        {devices.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Connecting…
          </div>
        )}
        {devices.map(d => {
          const isThis = d.id === deviceId
          const isActive = d.id === activeDeviceId || d.isActive
          return (
            <div
              key={d.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                isActive ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`p-2 rounded-md ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {isActive ? (
                    <Speaker className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {d.name}
                    {isThis && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        This device
                      </span>
                    )}
                    {isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                        Now playing
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last seen {new Date(d.lastSeenAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {isThis && !isActive && (
                <Button
                  size="sm"
                  onClick={() => {
                    claimPlayback()
                    toast.success("Playback transferred here")
                  }}
                >
                  <Play className="w-4 h-4 mr-2" /> Play here
                </Button>
              )}
              {!isThis && (
                <div className="text-xs text-muted-foreground">
                  Open this account on that device to control it
                </div>
              )}
            </div>
          )
        })}
        <div className="text-xs text-muted-foreground pt-2">
          Your device ID: <code className="font-mono">{deviceId || "…"}</code> —{" "}
          {deviceName}
        </div>
      </CardContent>
    </Card>
  )
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
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
  )
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { settings, updateSettings, resetSettings, hydrated } = useSettings()
  const [testText, setTestText] = useState("困っちまうこれは誰かのせい")
  const [testResult, setTestResult] = useState<string>("")
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Apply theme setting
  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    if (settings.theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else if (settings.theme === "light") {
      root.classList.add("light")
      root.classList.remove("dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.toggle("dark", prefersDark)
      root.classList.toggle("light", !prefersDark)
    }
  }, [settings.theme, hydrated])

  const handleTestRomanize = async () => {
    if (!testText.trim()) return
    setTesting(true)
    try {
      const res = await fetch("/api/lyrics/romanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          language: settings.romanizeLanguage === "auto" ? undefined : settings.romanizeLanguage,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setTestResult(data.romanized)
      toast.success(`Romanized successfully${data.language ? ` (${data.language})` : ""}`)
    } catch (e) {
      toast.error("Failed to romanize text")
      setTestResult("")
    } finally {
      setTesting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return
    if (!confirm("Really delete your account permanently?")) return
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" })
      if (res.ok) {
        toast.success("Account deleted")
        router.push("/login")
      } else if (res.status === 405 || res.status === 404) {
        toast.error("Account deletion is not yet available. Contact an admin.")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || "Failed to delete account")
      }
    } catch {
      toast.error("Network error")
    }
  }

  if (status === "loading" || !hydrated) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Customize your Musicy experience
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetSettings()
                toast.success("Settings reset to defaults")
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>

          <Tabs defaultValue="lyrics" className="w-full">
            <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full">
              <TabsTrigger value="lyrics"><Languages className="w-4 h-4 mr-1.5" />Lyrics</TabsTrigger>
              <TabsTrigger value="audio"><Music className="w-4 h-4 mr-1.5" />Audio</TabsTrigger>
              <TabsTrigger value="playback"><Play className="w-4 h-4 mr-1.5" />Playback</TabsTrigger>
              <TabsTrigger value="devices"><Radio className="w-4 h-4 mr-1.5" />Devices</TabsTrigger>
              <TabsTrigger value="appearance"><Palette className="w-4 h-4 mr-1.5" />Appearance</TabsTrigger>
              <TabsTrigger value="privacy"><Shield className="w-4 h-4 mr-1.5" />Privacy</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1.5" />Notifications</TabsTrigger>
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
                    romanized text using <span className="font-mono">serika-romanizer</span>.
                    No AI is involved, so results may contain mistakes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <SettingRow
                    title="Auto-romanize lyrics"
                    description="Automatically romanize lyrics in supported languages while playing"
                  >
                    <Switch
                      checked={settings.autoRomanizeLyrics}
                      onCheckedChange={v => updateSettings({ autoRomanizeLyrics: v })}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Show original alongside romanization"
                    description="Display both original and romanized lyrics simultaneously"
                  >
                    <Switch
                      checked={settings.showRomanizationAlongside}
                      onCheckedChange={v => updateSettings({ showRomanizationAlongside: v })}
                      disabled={!settings.autoRomanizeLyrics}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Language detection"
                    description="Choose automatic detection or force a specific language"
                  >
                    <SegmentedControl
                      value={settings.romanizeLanguage}
                      onChange={v => updateSettings({ romanizeLanguage: v })}
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
                    <Label className="text-sm font-medium">Test romanization</Label>
                    <textarea
                      value={testText}
                      onChange={e => setTestText(e.target.value)}
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
                            setTestText("")
                            setTestResult("")
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {testResult && (
                      <div className="p-3 bg-muted rounded-md border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Romanized:</div>
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
                      onChange={v => updateSettings({ audioQuality: v })}
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
                      onCheckedChange={v => updateSettings({ normalizeVolume: v })}
                    />
                  </SettingRow>

                  <div className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-sm font-medium">Default volume</Label>
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
                      onValueChange={v => updateSettings({ defaultVolume: v[0] / 100 })}
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
                        {settings.crossfadeSeconds === 0 ? "Off" : `${settings.crossfadeSeconds}s`}
                      </span>
                    </div>
                    <Slider
                      value={[settings.crossfadeSeconds]}
                      onValueChange={v => updateSettings({ crossfadeSeconds: v[0] })}
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
                      onCheckedChange={v => updateSettings({ autoplayRecommendations: v })}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Gapless playback"
                    description="Remove silence between tracks for continuous listening"
                  >
                    <Switch
                      checked={settings.gaplessPlayback}
                      onCheckedChange={v => updateSettings({ gaplessPlayback: v })}
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
                      onChange={v => updateSettings({ theme: v })}
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
                      onCheckedChange={v => updateSettings({ reducedMotion: v })}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Compact mode"
                    description="Use a denser UI with smaller padding"
                  >
                    <Switch
                      checked={settings.compactMode}
                      onCheckedChange={v => updateSettings({ compactMode: v })}
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
                  <CardDescription>Control your data and visibility</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <SettingRow
                    title="Private session"
                    description="Don't record listening activity while enabled"
                  >
                    <Switch
                      checked={settings.privateSession}
                      onCheckedChange={v => updateSettings({ privateSession: v })}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Allow scrobbling"
                    description="Share playback with external scrobbling services (Last.fm, etc.)"
                  >
                    <Switch
                      checked={settings.allowScrobbling}
                      onCheckedChange={v => updateSettings({ allowScrobbling: v })}
                    />
                  </SettingRow>

                  <div className="pt-4">
                    <Button variant="outline" size="sm" onClick={() => router.push("/profile")}>
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
                    <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <SettingRow
                    title="Now playing notifications"
                    description="Show a browser notification when a new track starts"
                  >
                    <Switch
                      checked={settings.showNowPlayingNotifications}
                      onCheckedChange={async v => {
                        if (v && "Notification" in window && Notification.permission !== "granted") {
                          const perm = await Notification.requestPermission()
                          if (perm !== "granted") {
                            toast.error("Notification permission denied")
                            return
                          }
                        }
                        updateSettings({ showNowPlayingNotifications: v })
                      }}
                    />
                  </SettingRow>

                  <SettingRow
                    title="New releases"
                    description="Get notified when followed artists release new music"
                  >
                    <Switch
                      checked={settings.notifyOnNewReleases}
                      onCheckedChange={v => updateSettings({ notifyOnNewReleases: v })}
                    />
                  </SettingRow>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Saved indicator */}
          <div className="flex items-center justify-center text-xs text-muted-foreground pt-4">
            <Check className="w-3 h-3 mr-1.5 text-green-500" />
            Changes are saved automatically
          </div>
        </div>
      </main>
    </div>
  )
}
