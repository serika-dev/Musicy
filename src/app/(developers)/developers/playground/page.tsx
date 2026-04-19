"use client"

import { useState, useEffect } from "react"
import { DocsSidebar } from "@/components/docs-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Play, Terminal, Send, Trash2, 
  ChevronRight, Database, Globe,
  Shield, Code, List
} from "lucide-react"
import { toast } from "sonner"

const ENDPOINTS = [
  { id: "get-track", name: "Get Track", method: "GET", path: "/api/tracks/{id}", category: "Tracks" },
  { id: "get-tracks", name: "List Tracks", method: "GET", path: "/api/tracks?limit=20", category: "Tracks" },
  { id: "get-album", name: "Get Album", method: "GET", path: "/api/albums/{id}", category: "Albums" },
  { id: "get-artist", name: "Get Artist", method: "GET", path: "/api/artists/{id}", category: "Artists" },
  { id: "get-playlist", name: "Get Playlist", method: "GET", path: "/api/playlists/{id}", category: "Playlists" },
  { id: "search", name: "Search", method: "GET", path: "/api/search?q={query}&type=track", category: "Search" },
]

export default function ApiPlayground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0])
  const [params, setParams] = useState<any>({ id: "cl...", query: "Imagine" })
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ""

  const handleSend = async () => {
    setIsLoading(true)
    setResponse(null)
    
    let path = selectedEndpoint.path
    Object.keys(params).forEach(key => {
      path = path.replace(`{${key}}`, params[key])
    })

    try {
      const res = await fetch(path, {
        headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
      })
      const data = await res.json()
      setResponse(data)
      if (!res.ok) toast.error(`Error: ${res.status}`)
      else toast.success("Request complete")
    } catch (err) {
      toast.error("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar */}
          <aside className="space-y-12">
             <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary ml-4">Playground</h4>
                <div className="flex flex-col gap-1">
                   {ENDPOINTS.map((ep) => (
                     <button 
                       key={ep.id}
                       onClick={() => setSelectedEndpoint(ep)}
                       className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black italic uppercase text-xs ${
                         selectedEndpoint.id === ep.id ? 'bg-primary/10 text-primary' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                       }`}
                     >
                        <div className="flex items-center gap-3">
                           <span className={`text-[8px] px-1.5 py-0.5 rounded ${ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                             {ep.method}
                           </span>
                           {ep.name}
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-20" />
                     </button>
                   ))}
                </div>
             </div>
          </aside>

          {/* Main Area */}
          <main className="lg:col-span-3 space-y-12">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                   <h1 className="text-5xl font-black italic tracking-tighter uppercase">API Explorer</h1>
                   <div className="flex items-center gap-3 text-sm font-bold text-white/30 truncate max-w-xl">
                      <Globe className="w-4 h-4" />
                      {appUrl}{selectedEndpoint.path.replace('{id}', params.id || '...').replace('{query}', params.query || '...')}
                   </div>
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="h-16 px-12 rounded-full font-black italic text-xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]"
                >
                   {isLoading ? 'Sending...' : 'Run Request'}
                   <Send className="ml-2 w-5 h-5" />
                </Button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Configuration */}
                <div className="space-y-8 h-fit">
                   <div className="bg-neutral-900/50 p-10 rounded-[3rem] border border-white/5 space-y-8">
                      <h3 className="text-xl font-black uppercase tracking-tighter italic">Headers & Params</h3>
                      
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">API Key (Optional)</label>
                            <Input 
                               value={apiKey}
                               onChange={(e) => setApiKey(e.target.value)}
                               placeholder="Bearer KEY_..." 
                               type="password"
                               className="bg-black/60 border-white/10 h-14 rounded-xl font-bold px-6"
                            />
                         </div>

                         {selectedEndpoint.path.includes("{id}") && (
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">ID</label>
                              <Input 
                                value={params.id}
                                onChange={(e) => setParams({...params, id: e.target.value})}
                                placeholder="Core Resource ID" 
                                className="bg-black/60 border-white/10 h-14 rounded-xl font-bold px-6"
                              />
                           </div>
                         )}

                         {selectedEndpoint.path.includes("{query}") && (
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Query</label>
                              <Input 
                                value={params.query}
                                onChange={(e) => setParams({...params, query: e.target.value})}
                                placeholder="e.g. Imagine Dragons" 
                                className="bg-black/60 border-white/10 h-14 rounded-xl font-bold px-6"
                              />
                           </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* Console Output */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                         <Terminal className="w-4 h-4" /> Response Body
                      </div>
                      <button onClick={() => setResponse(null)} className="text-white/20 hover:text-white transition-colors">
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="bg-black rounded-[3rem] border border-white/10 p-8 h-[600px] overflow-auto font-mono text-sm group relative">
                      {response ? (
                        <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">
                           {JSON.stringify(response, null, 2)}
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-white/10">
                           <Database className="w-16 h-16 animate-pulse" />
                           <div className="font-black uppercase tracking-[0.2em] text-xs">Waiting for execution</div>
                        </div>
                      )}
                      
                      {response && (
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                             200 OK
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </main>
       </div>
    </div>
  )
}
