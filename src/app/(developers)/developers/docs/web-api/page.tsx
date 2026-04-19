"use client"

import { DocsSidebar } from "@/components/docs-sidebar"
import { Button } from "@/components/ui/button"
import { 
  Terminal, Layers, 
  ExternalLink, Github, Code,
  Server, Cpu, Database, Play
} from "lucide-react"
import Link from "next/link"

export default function WebApiDocs() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          <DocsSidebar />

          <main className="lg:col-span-3 space-y-16 max-w-4xl">
            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Data & Control</div>
               <h1 className="text-6xl font-black italic tracking-tighter uppercase">Web API Reference</h1>
               <p className="text-2xl text-white/40 font-medium leading-relaxed">
                  The Musicy Web API endpoints return JSON-formated data about tracks, artists, albums, and playlists.
               </p>
            </div>

            <section className="space-y-12">
               <h2 className="text-3xl font-black italic uppercase">Core Endpoints</h2>
               
               <div className="grid grid-cols-1 gap-6">
                  {[
                    { 
                      name: "Get Track", 
                      method: "GET", 
                      path: "/api/tracks/{id}", 
                      desc: "Get detailed information about a single track.",
                      icon: Cpu 
                    },
                    { 
                      name: "Search", 
                      method: "GET", 
                      path: "/api/search", 
                      desc: "Search for tracks, albums, artists or playlists.",
                      icon: Database 
                    },
                  ].map((ep) => (
                    <div key={ep.name} className="p-10 rounded-[3rem] bg-neutral-900/40 border border-white/5 hover:border-indigo-500/20 transition-all group">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <ep.icon className="w-6 h-6" />
                             </div>
                             <h3 className="text-2xl font-black uppercase italic tracking-tighter">{ep.name}</h3>
                          </div>
                          <Badge variant="GET">{ep.method}</Badge>
                       </div>
                       <p className="text-white/40 font-medium leading-relaxed mb-8">
                          {ep.desc}
                       </p>
                       <div className="flex items-center gap-4">
                          <code className="bg-black px-6 py-3 rounded-xl border border-white/5 text-emerald-400 font-mono text-sm flex-1">
                             {ep.path}
                          </code>
                          <Button asChild size="sm" className="rounded-xl h-12 px-6 font-black italic uppercase tracking-widest bg-primary/20 text-primary hover:bg-primary/30 border-none">
                             <Link href="/developers/playground">Try it <Play className="ml-2 w-4 h-4 fill-current" /></Link>
                          </Button>
                       </div>
                    </div>
                  ))}
               </div>
            </section>
          </main>
       </div>
    </div>
  )
}

function Badge({ children, variant }: any) {
  return (
    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
      variant === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    }`}>
      {children}
    </div>
  )
}
