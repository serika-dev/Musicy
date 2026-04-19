"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Music2, Search, User, LogOut, Settings, Shield, LayoutDashboard } from "lucide-react"

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

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || "?"

  const isAdmin = session?.user?.role === "ADMIN"
  const avatarSrc = session?.user?.avatarUrl || session?.user?.image || ""

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="w-full px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group transition-transform active:scale-95 shrink-0"
        >
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Music2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Musicy
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 ml-4">
          <Link href="/playlists" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hover:translate-y-[-1px]">
            Playlists
          </Link>
          <Link href="/artists" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hover:translate-y-[-1px]">
            Artists
          </Link>
          <Link href="/albums" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hover:translate-y-[-1px]">
            Albums
          </Link>
        </nav>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists, albums..."
              className="w-full pl-10 h-10 bg-secondary/30 border-border/20 focus:border-primary/30 focus:bg-secondary/50 rounded-xl text-sm transition-all shadow-sm focus:shadow-md"
            />
          </form>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-10 w-10 hover:bg-secondary/50"
            onClick={() => router.push('/search')}
          >
            <Search className="h-5 w-5" />
          </Button>

          {status === "loading" ? (
            <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarSrc} alt={session.user?.name || "Profile"} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                      <Shield className="w-2 h-2 text-primary-foreground" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-card/95 backdrop-blur-xl border-border/50">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarSrc} alt={session.user?.name || "Profile"} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold leading-tight">{session.user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">@{session.user?.username || session.user?.email}</p>
                      {isAdmin && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-1 w-fit">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin" className="text-primary">
                        <Shield className="mr-2 h-4 w-4" />Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
