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
    <div className="flex flex-col h-screen bg-background text-foreground">
      {!isAuthPage && <Header />}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop sidebar */}
        {/* overflow-hidden is a hard stop: nothing in the sidebar may bleed
            into the content column, whatever a child's CSS tries to do. */}
        {showSidebar && (
          <div className="hidden lg:flex w-64 flex-shrink-0 min-w-0 overflow-hidden p-2 pr-0">
            <Sidebar className={`h-full min-w-0 ${currentTrack ? 'pb-24' : 'pb-4'}`} />
          </div>
        )}

        {/* Main content. Bottom padding accounts for the mobile nav + the
            floating player bar (which sits above the nav on phones).
            Use min-h-0 so flex doesn't block scrolling, and CSS vars so
            the last rows stay clear of the player chrome. */}
        <main
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
            currentTrack
              ? "pb-[var(--content-pad-player-mobile)] lg:pb-[var(--content-pad-player-desktop)]"
              : "pb-[var(--content-pad-nav-mobile)] lg:pb-6",
            showSidebar ? "lg:pl-2" : "",
          )}
          style={{
            scrollPaddingBottom: currentTrack
              ? "var(--content-pad-player-mobile)"
              : "var(--content-pad-nav-mobile)",
          }}
        >
          <div className="flex min-h-full w-full flex-col">
            <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
            {/* Footer handles its own route visibility checks */}
            {!isAuthPage && <SiteFooter />}
          </div>
        </main>
      </div>

      {showSidebar && <MobileNav />}
      <PlayerBar />
    </div>
  )
}
