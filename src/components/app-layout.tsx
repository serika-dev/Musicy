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

  // Don't show sidebar on auth pages
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register")
  const showSidebar = session && !isAuthPage

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      {!isAuthPage && <Header />}
      
      {/* Mobile Sidebar Button */}
      {showSidebar && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 lg:hidden bg-background/80 backdrop-blur-sm border"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Mobile Sidebar Overlay */}
      {showSidebar && isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsMobileSidebarOpen(false)
            }
          }}
          aria-label="Close sidebar"
        />
      )}
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden lg:flex w-72 flex-shrink-0 p-2 pl-2 pr-0">
            <Sidebar className={`h-full ${currentTrack ? 'pb-28' : ''}`} />
          </div>
        )}

        {/* Mobile Sidebar */}
        {showSidebar && (
          <div
            className={`fixed top-0 left-0 z-50 h-full w-72 bg-background border-r transform transition-transform duration-300 ease-in-out lg:hidden ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="p-2 h-full pt-16"> {/* pt-16 to account for mobile menu button */}
              <Sidebar className={`h-full ${currentTrack ? 'pb-28' : ''}`} />
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div 
          className={`flex-1 overflow-auto ${
            currentTrack ? "pb-24" : "pb-0"
          } ${
            showSidebar ? "lg:pl-2" : ""
          } ${
            showSidebar ? "pt-16 lg:pt-0" : ""
          }`}
        >
          {children}
        </div>
      </div>
      
      {/* Audio Player - always render, it handles its own visibility */}
      <AudioPlayer />
    </div>
  )
}
