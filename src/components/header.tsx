"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
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
import { Search, User, LogOut, Settings, Shield, LayoutDashboard, Home, LayoutGrid } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

export function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" or Cmd/Ctrl+K jumps to search from anywhere, as in most music apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        if (!searchRef.current || searchRef.current.offsetParent === null) return
        e.preventDefault()
        searchRef.current.focus()
        searchRef.current.select()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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
    <header className="sticky top-0 z-50 bg-background">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 lg:h-16 lg:px-4">
        {/* Wordmark */}
        <Link
          href="/"
          aria-label="Musicy home"
          className="group shrink-0 transition-opacity active:scale-95 hover:opacity-90 lg:w-[17.5rem] xl:w-[19rem]"
        >
          <Logo size="md" />
        </Link>

        {/* Home + search, centred like Spotify's desktop client */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={cn(
              "h-12 w-12 shrink-0 rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105",
              pathname === "/" && "text-foreground",
            )}
          >
            <Link href="/" aria-label="Home" aria-current={pathname === "/" ? "page" : undefined}>
              <Home className={cn("!size-5", pathname === "/" && "fill-current")} />
            </Link>
          </Button>
          <form onSubmit={handleSearch} role="search" className="group relative w-full max-w-[30rem]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you want to play?"
              aria-label="Search songs, artists, albums"
              className="h-12 w-full rounded-full border-transparent bg-secondary pl-12 pr-16 text-[15px] shadow-none transition-colors placeholder:text-muted-foreground hover:bg-accent focus-visible:border-foreground/80 focus-visible:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
              <span className="mr-1 h-6 w-px bg-border" aria-hidden="true" />
              <Link
                href="/search"
                aria-label="Browse"
                title="Browse"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <LayoutGrid className="h-5 w-5" />
              </Link>
            </div>
          </form>
        </div>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="ml-auto shrink-0 rounded-full md:hidden"
        >
          <Link href="/search" aria-label="Search">
            <Search className="!size-5" />
          </Link>
        </Button>

        {/* Right Controls */}
        <div className="flex shrink-0 items-center justify-end gap-3 lg:w-[17.5rem] xl:w-[19rem]">
          {status === "loading" ? (
            <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-secondary p-0 transition-all hover:scale-105 hover:bg-accent active:scale-95" aria-label="Account menu">
                  <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                    <AvatarImage src={avatarSrc} alt={session.user?.name || "Profile"} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 shadow-md shadow-primary/30 ring-2 ring-background">
                      <Shield className="h-2.5 w-2.5 text-primary-foreground" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl border-border/60 bg-popover p-1.5 shadow-2xl">
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
            <Button className="h-10 rounded-full bg-foreground px-6 font-semibold text-background hover:scale-105 hover:bg-foreground" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
