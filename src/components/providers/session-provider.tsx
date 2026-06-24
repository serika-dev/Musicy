"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicPlayerProvider } from "@/contexts/music-player-context";
import { QueryProvider } from "./query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <MusicPlayerProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </MusicPlayerProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
