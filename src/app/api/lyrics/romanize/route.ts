import { NextRequest, NextResponse } from "next/server"
import { romanize } from "serikaromanizer"
import { prisma } from "@/lib/db"
import {
  detectLanguage,
  hasRomanizableText,
  preprocessForRomanization,
  romanizeSyncedLyrics,
  type SupportedLang,
} from "@/lib/romanize-helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Lyric romanization (kuromoji first-load) can take a few seconds.
export const maxDuration = 60

type Mode = "plain" | "synced"

interface Body {
  text?: string
  trackId?: string
  mode?: Mode
  language?: SupportedLang
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const mode: Mode = body.mode === "synced" ? "synced" : "plain"

    // --- Track-cached path: instant on cache hit ---
    if (body.trackId) {
      const track = await prisma.track.findUnique({
        where: { id: body.trackId },
        select: {
          id: true,
          plainLyrics: true,
          syncedLyrics: true,
          romanizedPlain: true,
          romanizedSynced: true,
          romanizedLanguage: true,
        },
      })
      if (!track) {
        return NextResponse.json({ message: "Track not found" }, { status: 404 })
      }

      const source = mode === "synced" ? track.syncedLyrics : track.plainLyrics
      if (!source) {
        return NextResponse.json({ romanized: "", language: null })
      }

      const cached = mode === "synced" ? track.romanizedSynced : track.romanizedPlain
      // Reject stale cache produced by earlier versions that left iteration
      // marks / unromanized kanji in the output.
      const STALE_RE = /[々ヽヾゝゞ\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u0900-\u097F]/
      if (cached && !STALE_RE.test(cached)) {
        return NextResponse.json({
          romanized: cached,
          language: track.romanizedLanguage,
          cached: true,
        })
      }

      const lang: SupportedLang | null =
        body.language ?? detectLanguage(source)
      if (!lang || !hasRomanizableText(source)) {
        return NextResponse.json({ romanized: source, language: null })
      }

      let romanized: string
      if (mode === "synced") {
        romanized = await romanizeSyncedLyrics(source, lang)
      } else {
        romanized = await romanize(preprocessForRomanization(source, lang), lang)
      }

      // Persist cache (write both possible fields in one query)
      await prisma.track.update({
        where: { id: track.id },
        data: {
          ...(mode === "synced"
            ? { romanizedSynced: romanized }
            : { romanizedPlain: romanized }),
          romanizedLanguage: lang,
        },
      })

      return NextResponse.json({ romanized, language: lang, cached: false })
    }

    // --- Adhoc text path (e.g. settings test button) ---
    const text = body.text
    if (!text || typeof text !== "string") {
      return NextResponse.json({ message: "text or trackId is required" }, { status: 400 })
    }
    const lang: SupportedLang | null =
      body.language ?? detectLanguage(text)
    if (!lang) return NextResponse.json({ romanized: text, language: null })

    const out = await romanize(preprocessForRomanization(text, lang), lang)
    return NextResponse.json({ romanized: out, language: lang, cached: false })
  } catch (error) {
    console.error("Error romanizing text:", error)
    return NextResponse.json(
      {
        message: "Failed to romanize text",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
