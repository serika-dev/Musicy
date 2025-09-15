"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Music, Search, User, LogOut, Settings } from "lucide-react"

export function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-2 lg:space-x-3 hover:opacity-80 transition-opacity"
          >
            <Music className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Musicy</h1>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 ml-10">
            <Link 
              href="/playlists" 
              className="text-lg text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Playlists
            </Link>
            <Link 
              href="/artists" 
              className="text-lg text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Artists
            </Link>
            <Link 
              href="/albums" 
              className="text-lg text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Albums
            </Link>
          </nav>

          {/* Enhanced Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-2xl mx-4 lg:mx-10">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs, artists, albums..."
                className="w-full pl-10 lg:pl-12 h-10 lg:h-12 text-base lg:text-lg border-2 focus:border-primary rounded-full bg-background/50"
              />
            </form>
          </div>

          {/* User Menu / Auth */}
          <div className="flex items-center space-x-2 lg:space-x-6">
            {/* Mobile Search Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-9 w-9 lg:h-10 lg:w-10"
              onClick={() => router.push('/search')}
            >
              <Search className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>

            {/* User Menu or Sign In */}
            {status === "loading" ? (
              <div className="w-8 h-8 lg:w-10 lg:h-10 animate-spin rounded-full border-b-2 border-primary"></div>
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden">
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt="Profile"
                        fill
                        className="object-cover rounded-full"
                        sizes="(max-width: 1024px) 36px, 40px"
                      />
                    ) : (
                      <User className="h-4 w-4 lg:h-5 lg:w-5" />
                    )}
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-2 p-2">
                      <p className="text-base font-medium">
                        {session.user?.name || session.user?.email}
                      </p>
                      {session.user?.email && (
                        <p className="text-sm text-muted-foreground">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="p-3">
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-3 h-5 w-5" />
                      <span className="text-base">Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3">
                    <Link href="/dashboard" className="cursor-pointer">
                      <Music className="mr-3 h-5 w-5" />
                      <span className="text-base">Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3">
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-3 h-5 w-5" />
                      <span className="text-base">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-destructive focus:text-destructive p-3"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="text-base">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" className="lg:text-lg" asChild>
                <Link href="/login">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
