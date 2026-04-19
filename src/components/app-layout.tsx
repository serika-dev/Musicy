"use client"

import { AudioPlayer } from "@/components/audio-player"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState, useEffect } from "react"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentTrack } = useMusicPlayer()
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register")
  const showSidebar = session && !isAuthPage

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      {!isAuthPage && <Header />}

      {/* Mobile sidebar toggle */}
      {showSidebar && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 lg:hidden h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      )}

      {/* Mobile overlay */}
      {showSidebar && isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {showSidebar && (
          <div className="hidden lg:flex w-64 flex-shrink-0 p-2 pr-0">
            <Sidebar className={`h-full ${currentTrack ? 'pb-20' : ''}`} />
          </div>
        )}

        {/* Mobile sidebar */}
        {showSidebar && (
          <div className={`fixed top-0 left-0 z-50 h-full w-64 bg-background border-r border-border/50 transform transition-transform duration-200 ease-out lg:hidden ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-2 h-full pt-14">
              <Sidebar className={`h-full ${currentTrack ? 'pb-20' : ''}`} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className={`flex-1 overflow-auto ${currentTrack ? 'pb-20' : ''} ${showSidebar ? 'lg:pl-2' : ''} ${showSidebar ? 'pt-14 lg:pt-0' : ''}`}>
          <div className="container mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      <AudioPlayer />
    </div>
  )
}
