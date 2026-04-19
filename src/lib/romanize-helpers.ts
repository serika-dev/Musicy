import { romanize } from "serikaromanizer"

export type SupportedLang = "ja" | "ko" | "hi"

export function detectLanguage(text: string): SupportedLang | null {
  const hasHiraganaKatakana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text)
  const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)
  const hasDevanagari = /[\u0900-\u097F]/.test(text)
  const hasCJK = /[\u4E00-\u9FFF]/.test(text)

  if (hasHiraganaKatakana || hasCJK) return "ja"
  if (hasKorean) return "ko"
  if (hasDevanagari) return "hi"
  return null
}

export function hasRomanizableText(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u0900-\u097F]/.test(text)
}

/**
 * Pre-process Japanese text to expand iteration marks:
 *   々 → repeats previous kanji (星々 → 星星, hoshihoshi)
 *   ヽ → repeats previous katakana
 *   ヾ → repeats previous katakana + dakuten
 *   ゝ → repeats previous hiragana
 *   ゞ → repeats previous hiragana + dakuten
 * kuromoji/SerikaRomanizer often leaves these untouched otherwise.
 */
function expandIterationMarks(text: string): string {
  const result: string[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const prev = result[result.length - 1]
    if (!prev) {
      result.push(ch)
      continue
    }
    const prevCode = prev.charCodeAt(0)
    const isKanji = prevCode >= 0x4e00 && prevCode <= 0x9fff
    const isKatakana = prevCode >= 0x30a0 && prevCode <= 0x30ff
    const isHiragana = prevCode >= 0x3040 && prevCode <= 0x309f

    if (ch === "々" && isKanji) {
      result.push(prev)
    } else if (ch === "ヽ" && isKatakana) {
      result.push(prev)
    } else if (ch === "ヾ" && isKatakana) {
      result.push(prev)
    } else if (ch === "ゝ" && isHiragana) {
      result.push(prev)
    } else if (ch === "ゞ" && isHiragana) {
      result.push(prev)
    } else {
      result.push(ch)
    }
  }
  return result.join("")
}

export function preprocessForRomanization(text: string, lang: SupportedLang): string {
  if (lang === "ja") return expandIterationMarks(text)
  return text
}

/**
 * Romanize a synced-lyric block line-by-line to keep timestamps intact.
 * Input: raw LRC ([mm:ss.xx] text). Output: same timestamps with romanized text.
 */
export async function romanizeSyncedLyrics(
  syncedLyrics: string,
  lang: SupportedLang
): Promise<string> {
  const lines = syncedLyrics.split("\n")
  const LRC_RE = /^(\[\d{2}:\d{2}\.\d{2}\])(.*)$/
  // Extract texts and remember structure
  const texts: string[] = []
  const positions: number[] = []
  const prefixes: string[] = []
  const originals: string[] = []

  lines.forEach((line, idx) => {
    const m = line.match(LRC_RE)
    if (m) {
      positions.push(idx)
      prefixes.push(m[1])
      const text = m[2].trim()
      texts.push(text)
      originals.push(line)
    } else {
      originals.push(line)
    }
  })

  if (texts.length === 0) return syncedLyrics

  // Pre-expand iteration marks per-line, then batch-romanize
  const preprocessed = texts.map(t => preprocessForRomanization(t, lang))
  const SEP = "\n§§§LRC_SEP§§§\n"
  const joined = preprocessed.join(SEP)
  let romanized: string
  try {
    romanized = await romanize(joined, lang)
  } catch {
    return syncedLyrics
  }
  const parts = romanized.split(SEP)
  // If split mismatch, fall back to per-line romanization
  let romanizedTexts: string[]
  if (parts.length === texts.length) {
    romanizedTexts = parts
  } else {
    romanizedTexts = await Promise.all(
      preprocessed.map(async (t) => {
        try {
          return t.trim() ? await romanize(t, lang) : t
        } catch {
          return t
        }
      })
    )
  }

  // Stitch back together
  const result = [...originals]
  positions.forEach((lineIdx, i) => {
    result[lineIdx] = `${prefixes[i]} ${romanizedTexts[i].trim()}`
  })
  return result.join("\n")
}
