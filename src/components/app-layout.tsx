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

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentTrack } = useMusicPlayer()
  const { data: session } = useSession()
  const pathname = usePathname()

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register")
  const showSidebar = session && !isAuthPage

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
            {/* Footer is full-bleed; own padding lives inside SiteFooter */}
            {!isAuthPage && <SiteFooter />}
          </div>
        </main>
      </div>

      {showSidebar && <MobileNav />}
      <PlayerBar />
    </div>
  )
}
