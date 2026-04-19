"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Zap, Shield, Globe, Terminal, 
  ChevronRight, Layers 
} from "lucide-react"

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="lg:sticky lg:top-32 h-fit space-y-12">
       <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary ml-4">The Platform</h4>
          <nav className="flex flex-col gap-1">
             {[
               { name: "Quick Start", icon: Zap, href: "/developers/docs" },
               { name: "Authentication", icon: Shield, href: "/developers/docs/authentication" },
               { name: "api playground", icon: Terminal, href: "/developers/playground" },
               { name: "oEmbed API", icon: Globe, href: "/developers/docs/oembed" },
               { name: "iFrame SDK", icon: Layers, href: "/developers/docs/iframe-sdk" },
             ].map((item) => {
               const isActive = pathname === item.href
               return (
                 <Link 
                   key={item.name}
                   href={item.href}
                   className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all font-black italic uppercase text-sm ${
                     isActive ? 'bg-primary/10 text-primary' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                   }`}
                 >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                 </Link>
               )
             })}
          </nav>
       </div>

       <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 ml-4">Endpoints</h4>
          <nav className="flex flex-col gap-1">
             {[
               { name: "Tracks", href: "/developers/docs/web-api" },
               { name: "Albums", href: "/developers/docs/web-api" },
               { name: "Artists", href: "/developers/docs/web-api" },
               { name: "Playlists", href: "/developers/docs/web-api" },
               { name: "Search", href: "/developers/docs/web-api" }
             ].map((item) => (
               <Link 
                 key={item.name}
                 href={item.href}
                 className="flex items-center gap-3 px-6 py-3 rounded-2xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all font-bold text-sm"
               >
                  <ChevronRight className="w-3 h-3 text-white/10" />
                  {item.name}
               </Link>
             ))}
          </nav>
       </div>
    </aside>
  )
}
