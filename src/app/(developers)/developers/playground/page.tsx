"use client"

import { useState, useEffect } from "react"
import { DocsSidebar } from "@/components/docs-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Play, Terminal, Send, Trash2, 
  ChevronRight, Database, Globe,
  Shield, Code, List, Copy
} from "lucide-react"
import { toast } from "sonner"

const ENDPOINTS = [
  { id: "get-track", name: "Get Track", method: "GET", path: "/api/tracks/{id}", category: "Tracks", params: ["id"] },
  { id: "get-tracks", name: "List Tracks", method: "GET", path: "/api/tracks", category: "Tracks", params: ["limit", "offset"] },
  { id: "get-album", name: "Get Album", method: "GET", path: "/api/albums/{id}", category: "Albums", params: ["id"] },
  { id: "get-artist", name: "Get Artist", method: "GET", path: "/api/artists/{id}", category: "Artists", params: ["id"] },
  { id: "get-playlist", name: "Get Playlist", method: "GET", path: "/api/playlists/{id}", category: "Playlists", params: ["id"] },
  { id: "search", name: "Search", method: "GET", path: "/api/search", category: "Search", params: ["q", "type", "limit"] },
  { id: "get-daily", name: "Daily Mixes", method: "GET", path: "/api/daily-mixes", category: "Discovery", params: [] },
  { id: "get-me", name: "Get Current User", method: "GET", path: "/api/user/profile", category: "Users", params: [] },
  { id: "get-stats", name: "Platform Stats", method: "GET", path: "/api/stats", category: "Analytics", params: [] },
  { id: "get-apikeys", name: "List API Keys", method: "GET", path: "/api/api-keys", category: "Self", params: [] },
  { id: "get-oembed", name: "oEmbed Lookup", method: "GET", path: "/api/oembed", category: "Embeds", params: ["url"] },
]

export default function ApiPlayground() {
  const [isMounted, setIsMounted] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0])
  const [params, setParams] = useState<any>({ 
    id: "clow...", 
    q: "Imagine", 
    type: "track", 
    limit: "20", 
    offset: "0",
    url: "https://musicy.app/tracks/..."
  })
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [status, setStatus] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ""

  const buildUrl = (ep: typeof ENDPOINTS[0], p: any) => {
    let url = ep.path
    // Handle path params
    if (url.includes("{id}")) {
      url = url.replace("{id}", p.id || "")
    }

    // Handle query params
    const queryParts: string[] = []
    ep.params.forEach(key => {
      if (key !== "id" && p[key]) {
        queryParts.push(`${key}=${encodeURIComponent(p[key])}`)
      }
    })

    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`
    }

    return url
  }

  const handleSend = async () => {
    setIsLoading(true)
    setResponse(null)
    setStatus(null)
    setResponseTime(null)
    
    const start = Date.now()
    const path = buildUrl(selectedEndpoint, params)

    try {
      const res = await fetch(path, {
        headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
      })
      
      setStatus(res.status)
      setResponseTime(Date.now() - start)

      let data
      try {
        data = await res.json()
      } catch (e) {
        data = { error: "Invalid JSON response from server" }
      }
      
      setResponse(data)
      
      if (!res.ok) {
        toast.error(`Error ${res.status}: ${data.error || data.message || 'Request failed'}`)
      }
    } catch (err: any) {
      toast.error("Execution failed. Check your network or credentials.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getCurlCmd = () => {
    let path = selectedEndpoint.path
    Object.keys(params).forEach(key => {
      path = path.replace(`{${key}}`, params[key])
    })
    return `curl -X ${selectedEndpoint.method} "${appUrl}${path}" \\\n  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`
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
                   <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">API Explorer</h1>
                   <div className="flex items-center gap-3 text-sm font-bold text-white/30 truncate max-w-xl">
                      <Globe className="w-4 h-4" />
                      <span className="text-emerald-400/60">{selectedEndpoint.method}</span>
                      {isMounted ? `${appUrl}${buildUrl(selectedEndpoint, params)}` : '...'}
                   </div>
                </div>
                <Button 
                   onClick={handleSend}
                   disabled={isLoading}
                   className="h-16 px-12 rounded-full font-black italic text-xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] bg-primary hover:bg-primary/90 text-white border-none group"
                >
                   {isLoading ? 'Sending...' : 'Run Request'}
                   <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Configuration */}
                <div className="space-y-8 h-fit">
                   <div className="bg-neutral-900/50 p-10 rounded-[3rem] border border-white/5 space-y-8 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <h3 className="text-xl font-black uppercase tracking-tighter italic">Request Configuration</h3>
                      </div>
                      
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Authentication</label>
                            <Input 
                               value={apiKey}
                               onChange={(e) => setApiKey(e.target.value)}
                               placeholder="Bearer YOUR_API_KEY" 
                               type="password"
                               className="bg-black/60 border-white/10 h-14 rounded-xl font-bold px-6 focus:border-primary/50 transition-colors"
                            />
                         </div>

                         {selectedEndpoint.params.map(key => (
                            <div key={key} className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">{key}</label>
                               <Input 
                                 value={params[key] || ""}
                                 onChange={(e) => setParams({...params, [key]: e.target.value})}
                                 placeholder={`Enter ${key}...`}
                                 className="bg-black/60 border-white/10 h-14 rounded-xl font-bold px-6 focus:border-primary/50 transition-colors"
                               />
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="bg-black p-8 rounded-[2rem] border border-white/5 space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                         <Code className="w-4 h-4" /> cURL Template
                      </div>
                      <pre className="text-[10px] text-emerald-400 font-mono bg-neutral-900/50 p-4 rounded-xl break-all whitespace-pre-wrap">
                         {getCurlCmd()}
                      </pre>
                   </div>
                </div>

                {/* Console Output */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                         <Terminal className="w-4 h-4" /> Runtime Console
                      </div>
                      <div className="flex items-center gap-4">
                        {responseTime !== null && (
                          <span className="text-[10px] font-black text-white/20 italic">{responseTime}ms</span>
                        )}
                        {response && (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(response, null, 2))
                              toast.success("Response copied")
                            }} 
                            className="text-white/20 hover:text-white transition-colors"
                            title="Copy Response"
                          >
                             <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setResponse(null); setStatus(null); setResponseTime(null); }} className="text-white/20 hover:text-white transition-colors" title="Clear Console">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                   <div className="bg-black rounded-[3rem] border border-white/10 p-8 h-[600px] overflow-auto font-mono text-sm group relative">
                      {response ? (
                        <pre className="text-emerald-400/90 leading-relaxed whitespace-pre-wrap">
                           {JSON.stringify(response, null, 2)}
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-white/10">
                           <Database className={`w-16 h-16 ${isLoading ? 'animate-bounce text-primary' : 'animate-pulse'}`} />
                           <div className="font-black uppercase tracking-[0.2em] text-xs max-w-[200px]">
                              {isLoading ? 'Executing Request...' : 'Waiting for API execution'}
                           </div>
                        </div>
                      )}
                      
                      {status && (
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                             status >= 200 && status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                           }`}>
                             {status} {status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : 'Error'}
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
