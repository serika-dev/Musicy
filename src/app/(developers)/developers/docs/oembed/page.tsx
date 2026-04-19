"use client"

import { DocsSidebar } from "@/components/docs-sidebar"
import { 
  Globe, Info, CheckCircle2, 
  Terminal, Copy, ExternalLink 
} from "lucide-react"
import { toast } from "sonner"

export default function OEmbedDocs() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Snippet copied")
  }

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          <DocsSidebar />

          <main className="lg:col-span-3 space-y-16 max-w-4xl">
            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Discovery & Social</div>
               <h1 className="text-6xl font-black italic tracking-tighter uppercase">oEmbed API</h1>
               <p className="text-2xl text-white/40 font-medium leading-relaxed">
                  Transform Musicy URLs into rich, interactive player embeds on any platform.
               </p>
            </div>

            <section className="space-y-10">
               <div className="bg-orange-500/5 border-l-4 border-orange-500 p-10 rounded-r-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                     <Info className="w-5 h-5" /> Standard Format
                  </div>
                  <h3 className="text-3xl font-black italic uppercase">Spotify-Compatible</h3>
                  <p className="text-white/60 font-medium leading-relaxed text-lg">
                     Our oEmbed endpoint follows the standard precisely, making it compatible with WordPress, Discord, 
                     Slack, and any platform that supports link unfurling.
                  </p>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/30">API Endpoint</h4>
                     <button onClick={() => copyToClipboard(`${appUrl}/api/oembed?url=...`)} className="text-orange-500 font-black uppercase text-[10px] tracking-widest hover:underline flex items-center gap-2">
                        <Copy className="w-3 h-3" /> Copy URL
                     </button>
                  </div>
                  <div className="group bg-black p-8 rounded-[2rem] border border-white/10 font-mono text-lg text-emerald-400 overflow-x-auto relative">
                     {appUrl}/api/oembed?url=RESOURCE_URL
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/30">HTML Discovery</h4>
                  <p className="text-white/40 font-medium">Add this to your page &lt;head&gt; for automatic discovery:</p>
                  <div className="relative group bg-neutral-900 p-8 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto text-white/60">
<pre>{`<link rel="alternate" type="application/json+oembed"
      href="${appUrl}/api/oembed?url=${appUrl}/tracks/ABC"
      title="Musicy oEmbed Preview" />`}</pre>
                  </div>
               </div>
            </section>
          </main>
       </div>
    </div>
  )
}
