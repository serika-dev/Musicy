"use client"

import { DocsSidebar } from "@/components/docs-sidebar"
import { 
  Shield, Key, Lock, CheckCircle2, 
  Terminal, Copy, ExternalLink 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AuthDocs() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          <DocsSidebar />
          
          <main className="lg:col-span-3 space-y-16 max-w-4xl">
            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Security & Access</div>
               <h1 className="text-6xl font-black italic tracking-tighter uppercase">Authentication</h1>
               <p className="text-2xl text-white/40 font-medium leading-relaxed">
                  Secure your integrations using Musicy API Keys or industry-standard OAuth 2.0 flows.
               </p>
            </div>

            <section className="space-y-8">
               <h2 className="text-3xl font-black italic uppercase">1. API Keys</h2>
               <p className="text-lg text-white/60 font-medium leading-relaxed">
                  For server-side integrations or private scripts, API Keys are the quickest way to gain access. 
                  You can generate multiple keys for different applications in your dashboard.
               </p>
               <div className="bg-neutral-900 border border-white/5 p-8 rounded-[2rem] space-y-6">
                  <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-primary">
                     <Key className="w-5 h-5" /> Usage
                  </div>
                  <div className="bg-black p-6 rounded-2xl border border-white/10 font-mono text-emerald-400 text-sm overflow-x-auto">
                     Authorization: Bearer YOUR_API_KEY
                  </div>
               </div>
            </section>

            <section className="space-y-8">
               <h2 className="text-3xl font-black italic uppercase">2. OAuth 2.0 (Coming Soon)</h2>
               <p className="text-lg text-white/60 font-medium leading-relaxed">
                  Empower your users to grant your application access to their Musicy library without sharing credentials. 
                  We will support the standard Authorization Code flow.
               </p>
               <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Lock className="w-6 h-6" />
                     </div>
                     <div className="font-bold italic uppercase tracking-tight">Enterprise Identity Support</div>
                  </div>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 uppercase font-black text-[10px]">Development Phase</Badge>
               </div>
            </section>
          </main>
       </div>
    </div>
  )
}
