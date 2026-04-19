"use client"

import { DocsSidebar } from "@/components/docs-sidebar"
import { 
  Layers, Code, Smartphone, 
  Monitor, Play, Pause, SkipForward,
  Terminal, Copy, ExternalLink 
} from "lucide-react"

export default function IFrameSdkDocs() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          <DocsSidebar />

          <main className="lg:col-span-3 space-y-16 max-w-4xl">
            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Frontend Integration</div>
               <h1 className="text-6xl font-black italic tracking-tighter uppercase">iFrame SDK</h1>
               <p className="text-2xl text-white/40 font-medium leading-relaxed">
                  The Musicy iFrame API allows you to programmatically control playback and monitor state within your custom embeds.
               </p>
            </div>

            <section className="space-y-8">
               <h2 className="text-3xl font-black italic uppercase">1. Initialization</h2>
               <p className="text-lg text-white/60 font-medium leading-relaxed">
                  Include our lightweight JavaScript controller to start communicating with the Musicy embed iframe.
               </p>
               <div className="bg-neutral-900 border border-white/5 p-8 rounded-[2rem] space-y-6">
                  <div className="bg-black p-6 rounded-2xl border border-white/10 font-mono text-white/80 text-sm overflow-x-auto">
                     <pre>{`<script src="${appUrl}/embed/iframe-api/v1.js"></script>`}</pre>
                  </div>
               </div>
            </section>

            <section className="space-y-8">
               <h2 className="text-3xl font-black italic uppercase">2. Controller Instance</h2>
               <div className="relative group bg-neutral-900 p-8 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto text-emerald-400">
<pre>{`const player = new Musicy.Player({
  element: '#musicy-player',
  width: '100%',
  height: '380'
});

player.on('ready', () => {
  console.log('Player initialized');
  player.play();
});`}</pre>
               </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { name: "play()", icon: Play },
                 { name: "pause()", icon: Pause },
                 { name: "next()", icon: SkipForward },
               ].map((method) => (
                  <div key={method.name} className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col items-center gap-4 group hover:bg-primary/5 hover:border-primary/20 transition-all">
                     <method.icon className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />
                     <span className="font-black italic uppercase text-xs tracking-tighter">{method.name}</span>
                  </div>
               ))}
            </section>
          </main>
       </div>
    </div>
  )
}
