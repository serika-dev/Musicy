"use client"

import { useState } from "react"
import { Share2, Link as LinkIcon, Code, Check, Facebook, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface ShareMenuProps {
  title: string
  url: string
  id: string
  type: 'track' | 'album' | 'artist' | 'playlist'
  trigger?: React.ReactNode
}

export function ShareMenu({ title, url, id, type, trigger }: ShareMenuProps) {
  const [isEmbedOpen, setIsEmbedOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : ''
  const embedCode = typeof window !== 'undefined' ? `<iframe width="100%" height="152" title="Musicy Embed: ${title}" style="border-radius: 12px" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" src="${window.location.origin}/embed/${type}s/${id}"></iframe>` : ''

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Listening to ${title} on Musicy`)}&url=${encodeURIComponent(fullUrl)}`
    window.open(twitterUrl, '_blank')
  }

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`
    window.open(fbUrl, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode)
    toast.success("Embed code copied to clipboard")
    setIsEmbedOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="outline" size="lg" className="rounded-full border-white/10">
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-neutral-900 border-white/5 p-2 shadow-2xl">
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation()
              handleCopyLink()
            }} 
            className="rounded-xl font-bold py-3 cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 mr-3 text-emerald-500" /> : <LinkIcon className="h-4 w-4 mr-3" />}
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation()
              setIsEmbedOpen(true)
            }} 
            className="rounded-xl font-bold py-3 cursor-pointer"
          >
            <Code className="h-4 w-4 mr-3" />
            Embed {type}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem onClick={handleShareTwitter} className="rounded-xl font-bold py-3 cursor-pointer">
            <Twitter className="h-4 w-4 mr-3" />
            Post to Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareFacebook} className="rounded-xl font-bold py-3 cursor-pointer">
            <Facebook className="h-4 w-4 mr-3" />
            Share on Facebook
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEmbedOpen} onOpenChange={setIsEmbedOpen}>
        <DialogContent 
          className="max-w-xl bg-neutral-900 border-white/10 rounded-[2rem] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic">Embed {type}</DialogTitle>
            <DialogDescription className="font-medium text-white/60">
              Copy and paste the code below into your website to embed this {type}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4 max-w-full overflow-hidden">
            <div className="bg-black rounded-2xl border border-white/5 overflow-hidden">
               <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-white/40">Preview</span>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-none">152px Height</Badge>
               </div>
               <div className="p-0 bg-neutral-900 h-[152px]">
                  <iframe 
                    width="100%" 
                    height="152" 
                    src={`${window.location.origin}/embed/${type}s/${id}`}
                    frameBorder="0" 
                    allowFullScreen 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
               </div>
            </div>

            <div className="space-y-2 max-w-full">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-white/40">Embed Code</label>
                <Button variant="ghost" size="sm" onClick={handleCopyEmbed} className="text-primary font-bold hover:bg-primary/10">
                   Copy Code
                </Button>
              </div>
              <pre className="p-4 bg-black rounded-xl border border-white/5 overflow-x-auto text-[10px] font-mono leading-relaxed text-emerald-400/80 whitespace-pre-wrap break-all">
                {embedCode}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
