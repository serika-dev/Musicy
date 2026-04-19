"use client"

import { Button } from "@/components/ui/button"
import { 
  Zap, ArrowRight, Shield, Code, Globe, 
  Terminal, Sparkles, MoveRight
} from "lucide-react"
import Link from "next/link"

export default function DevelopersHome() {
  return (
    <div className="min-h-screen bg-black select-none">
      {/* Cinematic Hero */}
      <section className="relative pt-32 pb-40 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(var(--primary-rgb),0.08),transparent)] pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Sparkles className="w-3 h-3" />
              New: Lossless Audio SDK v2.0
            </div>
            
            <h1 className="text-7xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] uppercase">
              The Architecture <br />
              <span className="text-primary italic">of Sound.</span>
            </h1>
            
            <p className="text-2xl text-white/40 font-medium max-w-2xl leading-relaxed">
              Musicy APIs empower you to integrate world-class audio, cinematic metadata, 
              and real-time playback control into any application. Built for engineers who demand more.
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <Button asChild size="lg" className="rounded-full px-10 h-16 font-black italic text-xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-transform">
                <Link href="/developers/docs">Get Started <ArrowRight className="ml-2 w-6 h-6" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-10 h-16 font-black text-xl border-white/10 hover:bg-white/5">
                <Link href="/developers/dashboard">Control Center</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Abstract 3D-ish element */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      </section>

      {/* Quick Start Grid */}
      <section className="container mx-auto px-6 py-32">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/developers/docs/authentication" className="group p-10 rounded-[3rem] bg-neutral-900/40 border border-white/5 hover:border-primary/20 transition-all space-y-6">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Secure Access</h3>
               <p className="text-white/40 font-medium leading-relaxed">
                  Implement industry-standard OAuth 2.0 or Simple API Keys to access user data and library features.
               </p>
               <div className="pt-4 flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <MoveRight className="w-4 h-4" />
               </div>
            </Link>

            <Link href="/developers/docs/oembed" className="group p-10 rounded-[3rem] bg-neutral-900/40 border border-white/5 hover:border-primary/20 transition-all space-y-6">
               <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Universal Embeds</h3>
               <p className="text-white/40 font-medium leading-relaxed">
                  Utilize our 1:1 Spotify-compatible oEmbed API to unfurl Musicy links into interactive player previews.
               </p>
               <div className="pt-4 flex items-center gap-2 text-orange-500 font-black uppercase text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore oEmbed <MoveRight className="w-4 h-4" />
               </div>
            </Link>

            <Link href="/developers/docs/web-api" className="group p-10 rounded-[3rem] bg-indigo-500/10 border border-white/5 hover:border-primary/20 transition-all space-y-6">
               <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Terminal className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Real-time Web API</h3>
               <p className="text-white/40 font-medium leading-relaxed">
                  Programmatically fetch hi-res artwork, track details, and artist biographies via our RESTful endpoints.
               </p>
               <div className="pt-4 flex items-center gap-2 text-indigo-400 font-black uppercase text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  API Reference <MoveRight className="w-4 h-4" />
               </div>
            </Link>
         </div>
      </section>
    </div>
  )
}
