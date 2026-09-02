import type { Prisma, PrismaClient } from "@prisma/client"

/** Anything that can run genre queries: the pooled client or a transaction. */
export type GenreDb = PrismaClient | Prisma.TransactionClient

/**
 * Splits a free-form genre input ("Pop, Rock") into clean individual tags.
 * Deduplicates case-insensitively while keeping the first spelling, so an
 * admin pasting "j-pop, J-Pop" gets a single "j-pop" tag instead of two.
 */
export function splitGenreInput(input?: string | null): string[] {
  if (!input) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(",")) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

async function upsertGenre(db: GenreDb, name: string): Promise<string> {
  const existing = await db.genre.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await db.genre.create({ data: { name }, select: { id: true } })
  return created.id
}

/**
 * Replaces a track's genre tags with the given input and mirrors the first
 * tag into the legacy `genre` column, which still backs search, feeds and
 * older clients.
 */
export async function setTrackTags(
  db: GenreDb,
  trackId: string,
  input?: string | null
): Promise<string[]> {
  const names = splitGenreInput(input)
  await db.trackTag.deleteMany({ where: { trackId } })
  for (let position = 0; position < names.length; position++) {
    const genreId = await upsertGenre(db, names[position])
    await db.trackTag.create({ data: { trackId, genreId, position } })
  }
  await db.track.update({
    where: { id: trackId },
    data: { genre: names[0] ?? null },
  })
  return names
}

/** [setTrackTags] for albums. */
export async function setAlbumTags(
  db: GenreDb,
  albumId: string,
  input?: string | null
): Promise<string[]> {
  const names = splitGenreInput(input)
  await db.albumTag.deleteMany({ where: { albumId } })
  for (let position = 0; position < names.length; position++) {
    const genreId = await upsertGenre(db, names[position])
    await db.albumTag.create({ data: { albumId, genreId, position } })
  }
  await db.album.update({
    where: { id: albumId },
    data: { genre: names[0] ?? null },
  })
  return names
}

/** A genre filter matches any of a track's/album's tags (or the legacy column). */
export function genreTagFilter(genre: string) {
  return {
    OR: [
      { tags: { some: { genre: { name: { equals: genre, mode: "insensitive" as const } } } } },
      { genre: { equals: genre, mode: "insensitive" as const } },
    ],
  }
}
