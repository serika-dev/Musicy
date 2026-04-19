import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
  title: "Musicy for Developers",
  description: "Build the future of lossless music integration with Musicy APIs.",
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen selection:bg-primary/30`}>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-black tracking-tighter flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                 <span className="text-black font-black text-xs">M</span>
              </div>
              Musicy <span className="text-white/40 font-medium">Developers</span>
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
              <div className="text-lg font-black tracking-tighter">Musicy <span className="text-white/40">Developers</span></div>
              <p className="text-sm text-white/40 font-medium leading-relaxed">
                 Empowering developers to build high-fidelity audio experiences since 2024.
              </p>
           </div>
           {/* Footer columns could go here */}
        </div>
        <div className="container mx-auto px-6 pt-20 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
           <div>© 2026 Serika Ecosystem. All rights reserved.</div>
           <div className="flex gap-6">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Status</a>
           </div>
        </div>
      </footer>
      <Providers>
        <Toaster position="bottom-right" richColors theme="dark" />
      </Providers>
    </div>
  );
}
