"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Download, Home, Search, Library } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Search",
      icon: Search,
      href: "/search",
      active: pathname === "/search",
    },
    {
      label: "Library",
      icon: Library,
      href: "/playlists",
      active: pathname?.startsWith("/playlists") || pathname?.startsWith("/artists") || pathname?.startsWith("/albums") || pathname === "/liked-songs",
    },
    {
      label: "Downloads",
      icon: Download,
      href: "/downloads",
      active: pathname === "/downloads",
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/80 backdrop-blur-xl border-t border-border/40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90",
              item.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-6 w-6", item.active && "fill-current")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
