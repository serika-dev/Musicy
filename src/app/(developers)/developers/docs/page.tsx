"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DocsSidebar } from "@/components/docs-sidebar"
import { 
  Zap, Shield, Globe, Terminal, 
  Code, Layers, Info, CheckCircle2, 
  ChevronRight, Copy, ExternalLink 
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function DevelopersDocs() {
  const pathname = usePathname()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Snippet copied")
  }

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          <DocsSidebar />

          {/* Main Content Area */}
          <main className="lg:col-span-3 space-y-24 max-w-4xl">
             <section className="space-y-10">
                <div className="space-y-4">
                   <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-tight">Quick Start Guide</h1>
                   <p className="text-2xl text-white/40 font-medium leading-relaxed">
                      Begin your integration into the world's most premium lossless audio platform in under 5 minutes.
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5 space-y-4">
                      <CheckCircle2 className="text-primary w-8 h-8" />
                      <h4 className="text-xl font-black italic uppercase">1. Get Your Key</h4>
                      <p className="text-white/40 font-bold leading-relaxed">
                         Head to the dashboard and generate your unique client credentials.
                      </p>
                   </div>
                   <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5 space-y-4">
                      <CheckCircle2 className="text-primary w-8 h-8" />
                      <h4 className="text-xl font-black italic uppercase">2. Choose Integration</h4>
                      <p className="text-white/40 font-bold leading-relaxed">
                         Select between oEmbed for simplicity or the Web API for deep control.
                      </p>
                   </div>
                </div>
             </section>

             {/* oEmbed Section */}
             <section className="space-y-12">
                <div className="bg-primary/5 border-l-4 border-primary p-10 rounded-r-[2rem] space-y-4">
                   <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
                      <Info className="w-5 h-5" /> Key Feature
                   </div>
                   <h3 className="text-3xl font-black italic uppercase">oEmbed Mastery</h3>
                   <p className="text-white/60 font-medium leading-relaxed text-lg">
                      Musicy supports 1:1 Spotify-compatible oEmbed requests. Use our endpoint to instantly 
                      convert any Musicy URL into a playable iframe component.
                   </p>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/30">Standard Endpoint</h4>
                      <button onClick={() => copyToClipboard(`${appUrl}/api/oembed?url=...`)} className="text-primary font-black uppercase text-[10px] tracking-widest hover:underline flex items-center gap-2">
                         <Copy className="w-3 h-3" /> Copy URL
                      </button>
                   </div>
                   <div className="group bg-black p-8 rounded-[2rem] border border-white/10 font-mono text-lg text-emerald-400 overflow-x-auto relative">
                      {appUrl}/api/oembed?url=RESOURCE_URL
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/30">Example Implementation (HTML)</h4>
                   <div className="relative group bg-neutral-900 p-8 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto text-white/60">
<pre>{`<!-- In your document head -->
<link rel="alternate" type="application/json+oembed"
      href="${appUrl}/api/oembed?url=${appUrl}/tracks/abc" />

<!-- API Response -->
{
  "version": "1.0",
  "type": "rich",
  "provider_name": "Musicy",
  "html": "<iframe src='${appUrl}/embed/tracks/abc' ...></iframe>"
}`}</pre>
                   </div>
                </div>
             </section>

             {/* Web API Section Preview */}
             <section className="space-y-8 p-12 rounded-[3.5rem] bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20">
                <div className="flex items-center justify-between">
                   <div className="space-y-2">
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter">Web API Explorer</h3>
                      <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Exposing the Core of Musicy</p>
                   </div>
                   <div className="w-16 h-16 rounded-full border border-indigo-500/40 flex items-center justify-center">
                      <Terminal className="w-6 h-6 text-indigo-400" />
                   </div>
                </div>
                <p className="text-lg text-white/60 font-medium leading-relaxed">
                   Looking for more than just a player? Our Web API provides granular access to user profiles, 
                   audio analysis, and global charts.
                </p>
                <div className="flex gap-4 pt-4">
                   <Button variant="outline" className="rounded-full border-white/10 h-14 px-10 font-black italic group uppercase tracking-widest">
                      Coming Soon 
                      <ExternalLink className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </Button>
                </div>
             </section>
          </main>
       </div>
    </div>
  )
}
