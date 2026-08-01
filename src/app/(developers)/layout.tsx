import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSystemSetting } from "@/lib/settings";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Serika for Developers",
  description: "Build the future of lossless music integration with Serika APIs.",
};

export default async function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isApiAccessEnabled = (await getSystemSetting("PUBLIC_API_ACCESS", "true")) === "true";

  if (!isApiAccessEnabled) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">403</span>
          </div>
          <h1 className="text-xl font-extrabold">Public API Access Disabled</h1>
          <p className="text-xs text-zinc-400 font-medium">
            Developer API access and OAuth application endpoints are currently disabled by the system administrator.
          </p>
          <a href="/" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg">
            Return to App
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen selection:bg-primary/30`}>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-black tracking-tighter flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                 <span className="text-black font-black text-xs">S</span>
              </div>
              Serika <span className="text-white/40 font-medium">Developers</span>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/developers" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Home</Link>
              <Link href="/developers/docs" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Documentation</Link>
              <Link href="/developers/dashboard" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Dashboard</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Back to App</Link>
              <Button asChild size="sm" variant="ghost" className="text-white/60 text-[10px] font-black px-6 py-2 rounded-full hover:bg-white/5 transition-colors uppercase tracking-widest hidden md:flex">
                 <Link href="/developers/playground">Try Playground</Link>
              </Button>
              <Button asChild size="sm" className="bg-white text-black text-[10px] font-black px-6 py-2 rounded-full hover:bg-white/90 transition-colors uppercase tracking-widest">
                 <Link href="/developers/dashboard">My Dashboard</Link>
              </Button>
          </div>
        </div>
      </header>
      
      <main>
        {children}
      </main>

      <footer className="border-t border-white/5 py-20 bg-neutral-950/50 mt-20">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
           <div className="space-y-4">
              <div className="text-lg font-black tracking-tighter">Serika <span className="text-white/40">Developers</span></div>
              <p className="text-sm text-white/40 font-medium leading-relaxed">
                 Empowering developers to build high-fidelity audio experiences.
              </p>
           </div>
           {/* Footer columns could go here */}
        </div>
        <div className="container mx-auto px-6 pt-20 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
           <div> 2026 Serika. All rights reserved.</div>
              <div className="flex gap-6">
                 <a href="/privacy">Privacy</a>
                 <a href="/terms">Terms</a>
              </div>
        </div>
      </footer>
      <Providers>
        <Toaster position="bottom-right" richColors theme="dark" />
      </Providers>
    </div>
  );
}
