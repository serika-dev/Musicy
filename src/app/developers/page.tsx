"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Code, Terminal, TerminalIcon, Cpu, Globe, Share2, Layers } from "lucide-react"

export default function DevelopersPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <section className="py-20 text-center space-y-6 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl border border-white/5">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black uppercase tracking-tighter">
          <Cpu className="w-4 h-4" />
          Musicy for Developers
        </div>
        <h1 className="text-4xl lg:text-7xl font-black tracking-tight drop-shadow-2xl">
          Build the future of <br />
          <span className="text-primary italic">Lossless Integration.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg font-medium">
          Whether you're building a landing page, a blog, or a full-scale player ecosystem, 
          Musicy provides the APIs to bring high-fidelity music to your users.
        </p>
        <div className="flex justify-center gap-4">
           <Button size="lg" className="rounded-full px-8 font-bold italic">Get Started</Button>
           <Button size="lg" variant="outline" className="rounded-full px-8 font-bold border-white/10">Read Docs</Button>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary/60 px-4">Documentation</h3>
            <nav className="flex flex-col gap-1">
              <Button variant="ghost" className="justify-start font-bold rounded-xl text-primary bg-primary/5">oEmbed API</Button>
              <Button variant="ghost" className="justify-start font-bold rounded-xl text-muted-foreground hover:text-foreground">iFrame API</Button>
              <Button variant="ghost" className="justify-start font-bold rounded-xl text-muted-foreground hover:text-foreground">Web Playback SDK</Button>
              <Button variant="ghost" className="justify-start font-bold rounded-xl text-muted-foreground hover:text-foreground">Web API Reference</Button>
            </nav>
          </div>
          
          <Card className="bg-neutral-900 border-white/5 overflow-hidden">
             <CardHeader className="p-4 bg-primary/10 border-b border-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-primary" />
                   Status
                </CardTitle>
             </CardHeader>
             <CardContent className="p-4">
                <div className="flex items-center gap-4">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-sm font-bold text-emerald-500">v1.2.0 Operational</span>
                </div>
             </CardContent>
          </Card>
        </aside>

        {/* Documentation Content */}
        <main className="lg:col-span-3 space-y-16">
          <Tabs defaultValue="oembed">
            <TabsList className="bg-neutral-900 border-white/5 w-full justify-start p-1 h-auto rounded-2xl gap-2">
              <TabsTrigger value="oembed" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">oEmbed</TabsTrigger>
              <TabsTrigger value="iframe" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">iFrame API</TabsTrigger>
              <TabsTrigger value="webapi" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Web API</TabsTrigger>
            </TabsList>

            <TabsContent value="oembed" className="mt-8 space-y-10">
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Using the oEmbed API</h2>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  oEmbed allows you to fetch interactive player snippets by simply providing a Musicy URL. 
                  It's the easiest way to embed music in messages, blog posts, and previews.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                   <Globe className="w-5 h-5 text-primary" />
                   Endpoint URL
                </h3>
                <pre className="p-6 bg-neutral-950 rounded-2xl border border-white/5 overflow-x-auto text-sm font-mono leading-relaxed group">
                   <code className="text-emerald-400">GET https://musicy.app/api/oembed?url=https://musicy.app/tracks/ID</code>
                </pre>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold">Example Response</h3>
                <pre className="p-6 bg-neutral-950 rounded-2xl border border-white/5 overflow-x-auto text-sm font-mono leading-relaxed group">
<code className="text-blue-400">{`{
  "version": "1.0",
  "type": "rich",
  "provider_name": "Musicy",
  "title": "Summer Nights",
  "author_name": "Serika",
  "html": "<iframe width='100%' height='152' src='https://musicy.app/embed/tracks/ID'></iframe>",
  "thumbnail_url": "https://musicy.app/api/assets/cover.jpg"
}`}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="iframe" className="mt-8 space-y-10">
               <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Using the iFrame API</h2>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  Programmatically create and interact with Embeds. Control playback, switch tracks, 
                  and react to player events without leaving your host application.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                   <Code className="w-5 h-5 text-primary" />
                   1. Include the Library
                </h3>
                <pre className="p-6 bg-neutral-950 rounded-2xl border border-white/5 overflow-x-auto text-sm font-mono leading-relaxed group">
                   <code className="text-emerald-400">{`<script src="https://musicy.app/embed/iframe-api/v1.js" async></script>`}</code>
                </pre>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                   <TerminalIcon className="w-5 h-5 text-primary" />
                   2. Control Playback
                </h3>
                <pre className="p-6 bg-neutral-950 rounded-2xl border border-white/5 overflow-x-auto text-sm font-mono leading-relaxed group">
<code className="text-blue-300">{`window.onMusicyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('my-embed');
  const options = { uri: 'musicy:track:ID' };
  
  IFrameAPI.createController(element, options, (controller) => {
    controller.play(); // Programmatic play
    controller.loadUri('musicy:album:NEW_ID'); // Change content
  });
};`}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>

          {/* Call to Action */}
          <section className="p-10 lg:p-16 bg-neutral-900 rounded-[3rem] border border-white/10 text-center space-y-8 overflow-hidden relative group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
             <div className="space-y-4">
                <h2 className="text-3xl lg:text-5xl font-black tracking-tight italic">Ready to integrate?</h2>
                <p className="text-muted-foreground max-w-lg mx-auto font-medium">
                  Join the Serika developer community and build seamless audio experiences today.
                </p>
             </div>
             <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="rounded-full px-12 h-14 font-black text-lg group-hover:scale-105 transition-transform">
                   Create App
                   <Share2 className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-12 h-14 font-black text-lg border-white/10">
                   API Playground
                   <Layers className="ml-2 w-5 h-5" />
                </Button>
             </div>
          </section>
        </main>
      </div>
    </div>
  )
}
