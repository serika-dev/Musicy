"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Key, Plus, Trash2, Copy, Check, 
  Terminal, Shield, Layers, ExternalLink, Github
} from "lucide-react"
import { toast } from "sonner"

export default function DeveloperDashboard() {
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/api-keys")
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      })
      if (res.ok) {
        toast.success("API Key generated successfully")
        setNewKeyName("")
        fetchApiKeys()
      }
    } catch (err) {
      toast.error("Failed to generate API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("API Key revoked")
        fetchApiKeys()
      }
    } catch (err) {
      toast.error("Failed to revoke API key")
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="container mx-auto px-6 py-20 pb-40">
       <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-4">
             <h1 className="text-5xl font-black italic tracking-tighter uppercase">Control Center</h1>
             <p className="text-xl text-white/40 font-medium">Manage your Musicy client credentials and platform access.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             <div className="lg:col-span-2 space-y-8">
                <div className="bg-neutral-900/50 border border-white/5 rounded-[3rem] p-10 space-y-10 backdrop-blur-sm">
                   <div className="flex flex-wrap gap-4 items-end bg-black/40 p-8 rounded-[2rem] border border-white/5">
                      <div className="flex-1 space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Application Name</label>
                         <Input 
                           value={newKeyName}
                           onChange={(e) => setNewKeyName(e.target.value)}
                           placeholder="e.g. My Lossless Player" 
                           className="bg-black/60 border-white/10 rounded-xl h-14 font-bold px-6 text-lg focus:ring-primary/50"
                         />
                      </div>
                      <Button 
                        onClick={handleCreateKey}
                        disabled={isLoading || !newKeyName}
                        className="h-14 px-10 rounded-xl font-black italic text-lg"
                      >
                         <Plus className="mr-2 w-5 h-5" />
                         Generate Key
                      </Button>
                   </div>

                   <div className="space-y-4">
                      {apiKeys.length === 0 ? (
                        <div className="py-32 text-center space-y-6 bg-black/20 rounded-[2rem] border border-dashed border-white/5">
                           <Key className="w-16 h-16 text-white/5 mx-auto" />
                           <div className="text-white/20 font-black uppercase tracking-[0.2em] text-sm">Waiting for your first integration</div>
                        </div>
                      ) : (
                        apiKeys.map((key) => (
                          <div key={key.id} className="group bg-black/40 p-8 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all flex items-center justify-between">
                             <div className="space-y-2">
                                <h4 className="text-xl font-black italic uppercase tracking-tight">{key.name}</h4>
                                <div className="flex items-center gap-4">
                                   <div className="bg-black border border-white/5 px-4 py-2 rounded-lg font-mono text-xs text-white/40 group-hover:text-white/60 transition-colors">
                                      {key.key}
                                   </div>
                                   <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5">Active</Badge>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                  onClick={() => copyToClipboard(key.key, key.id)}
                                >
                                   {copiedKey === key.id ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-white/60" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-12 h-12 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={() => handleDeleteKey(key.id)}
                                >
                                   <Trash2 className="w-5 h-5" />
                                </Button>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
             </div>

             <aside className="space-y-8">
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-1 rounded-[3rem]">
                   <div className="bg-neutral-950 p-10 rounded-[2.9rem] space-y-8">
                      <h3 className="text-xl font-black uppercase tracking-tighter italic">API Quotas</h3>
                      <div className="space-y-6">
                         <div className="space-y-3">
                            <div className="flex justify-between items-end">
                               <span className="text-xs font-black uppercase tracking-widest text-white/40">Requests</span>
                               <span className="text-sm font-black italic">Free Tier</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full w-[15%] bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-white/20 uppercase tracking-widest">
                               <span>1,402 / 10,000</span>
                               <span>monthly</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <Card className="bg-neutral-900 border-white/5 rounded-[3rem] overflow-hidden">
                   <CardHeader className="bg-white/5 border-b border-white/5 p-8">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                         <Terminal className="w-4 h-4" />
                         Developer Kit
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-8 space-y-6 font-bold text-sm">
                      <a href="#" className="flex items-center justify-between group">
                         <span className="text-white/60 group-hover:text-white transition-colors">Web SDK Reference</span>
                         <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                      </a>
                      <a href="#" className="flex items-center justify-between group">
                         <span className="text-white/60 group-hover:text-white transition-colors">GitHub Community</span>
                         <Github className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                      </a>
                   </CardContent>
                </Card>
             </aside>
          </div>
       </div>
    </div>
  )
}
