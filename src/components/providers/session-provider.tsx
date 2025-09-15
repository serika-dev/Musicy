"use client"

import { SessionProvider } from "next-auth/react"
import { QueryProvider } from "./query-provider"
import { MusicPlayerProvider } from "@/contexts/music-player-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <MusicPlayerProvider>
          {children}
        </MusicPlayerProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
