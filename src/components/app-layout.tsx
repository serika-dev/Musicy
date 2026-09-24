"use client"

import { PlayerBar } from "@/components/player/player-bar"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"
import { SiteFooter } from "@/components/site-footer"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

import { useEffect, useState } from "react"
import { ShieldAlert, Lock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentTrack } = useMusicPlayer()
  const { data: session } = useSession()
  const pathname = usePathname()
  const [publicSettings, setPublicSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => setPublicSettings(data.settings || {}))
      .catch((err) => console.error("Error fetching public settings:", err))
  }, [])

  const isAuthPage = Boolean(pathname?.startsWith("/login") || pathname?.startsWith("/register"))
  const isAdminPage = Boolean(pathname?.startsWith("/admin"))
  const showSidebar = session && !isAuthPage
  const isMaintenanceMode = publicSettings.MAINTENANCE_MODE === "true" || publicSettings.maintenance_mode === "true"
  const isAdminUser = (session?.user as any)?.role === "ADMIN"

  if (isMaintenanceMode && !isAdminUser && !isAdminPage && !isAuthPage) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full space-y-6 bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Platform Maintenance</h1>
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              {publicSettings.SITE_NAME || "Serika Music"} is currently undergoing scheduled platform maintenance and system upgrades.
            </p>
          </div>
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>Status: Maintenance Active</span>
            <span className="text-amber-400 font-bold">503 Service Unavailable</span>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-10 text-xs shadow-lg gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Check Platform Status
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {!isAuthPage && <Header />}

      {/* Desktop: library panel + main panel side by side on a near-black
          canvas (Spotify-style). Phones get a single full-bleed column. */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden",
          showSidebar && "lg:gap-2 lg:px-2",
        )}
      >
        {/* overflow-hidden is a hard stop: nothing in the sidebar may bleed
            into the content column, whatever a child's CSS tries to do. */}
        {showSidebar && (
          <aside className="hidden w-[18.5rem] min-w-0 shrink-0 overflow-hidden lg:flex xl:w-80">
            <Sidebar className="h-full min-w-0 w-full" />
          </aside>
        )}

        {/* Main content. On phones the bottom padding clears the tab bar and
            the mini player that floats above it; on desktop the player is
            docked in the layout flow, so only a normal end gap is needed. */}
        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
            showSidebar && "app-panel-main lg:rounded-xl",
            currentTrack
              ? "pb-[var(--content-pad-player-mobile)] lg:pb-6"
              : "pb-[var(--content-pad-nav-mobile)] lg:pb-6",
          )}
          style={{
            scrollPaddingBottom: currentTrack
              ? "var(--content-pad-player-mobile)"
              : "var(--content-pad-nav-mobile)",
          }}
        >
          <div className="flex min-h-full w-full flex-col">
            <div className="flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8">{children}</div>
            {/* Footer handles its own route visibility checks */}
            {!isAuthPage && <SiteFooter />}
          </div>
        </main>
      </div>

      <PlayerBar />
      {showSidebar && <MobileNav />}
    </div>
  )
}
