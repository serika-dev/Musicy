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
    <nav
      aria-label="Primary"
      data-mobile-nav=""
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden h-[var(--mobile-nav-h)] bg-background/80 backdrop-blur-xl border-t border-border/40 px-3 pb-[var(--safe-bottom)]"
    >
      <div className="flex h-full items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "control-pop relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1",
              item.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-[1.375rem] w-[1.375rem]", item.active && "fill-current")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            {/* The active marker is a rail, not a colour change alone. */}
            <span
              className={cn(
                "absolute -top-px h-0.5 w-8 rounded-full bg-primary transition-opacity",
                item.active ? "opacity-100" : "opacity-0"
              )}
            />
          </Link>
        ))}
      </div>
    </nav>
  )
}
