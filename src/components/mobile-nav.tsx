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
      label: "Your Library",
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
      className="nav-fade fixed inset-x-0 bottom-0 z-30 pb-[var(--safe-bottom)] lg:hidden"
    >
      <div className="mx-auto flex h-[var(--mobile-nav-h)] max-w-md items-center justify-around px-2 pt-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-[color,transform] active:scale-90",
              item.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon
              className="h-6 w-6"
              strokeWidth={item.active ? 2.4 : 1.8}
            />
            <span className={cn("text-[11px]", item.active ? "font-semibold" : "font-medium")}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
