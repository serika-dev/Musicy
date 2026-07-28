"use client"

import { PlayerBar } from "@/components/player/player-bar"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"
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
            floating player bar (which sits above the nav on phones). */}
        <main className={cn(
          "flex-1 overflow-auto",
          currentTrack ? 'pb-44 lg:pb-28' : 'pb-24 lg:pb-0',
          showSidebar ? 'lg:pl-2' : ''
        )}>
          <div className="w-full h-full px-4 lg:px-8 py-6 mb-8">
            {children}
          </div>
        </main>
      </div>

      {showSidebar && <MobileNav />}
      <PlayerBar />
    </div>
  )
}
