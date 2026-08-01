import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  buildEntityMetadata,
  musicAlbumJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: { artist: true, _count: { select: { tracks: true } } },
  });

  if (!album) return {};

  const title = `${album.title} by ${album.artist.name} — Album on Serika Music`;
  const description = `Stream ${album.title} by ${album.artist.name} in lossless quality on Serika Music.${
    album._count.tracks ? ` ${album._count.tracks} tracks.` : ""
  } High-fidelity FLAC streaming.`;

  return buildEntityMetadata({
    path: `/albums/${id}`,
    title,
    description,
    imageUrl: album.coverImageUrl,
    imageAlt: `${album.title} by ${album.artist.name}`,
    ogType: "music.album",
    twitterPlayer: true,
    embedType: "albums",
    embedId: id,
  });
}

export default async function AlbumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: { artist: true, _count: { select: { tracks: true } } },
  });

  if (!album) return <>{children}</>;

  const url = absoluteUrl(`/albums/${id}`);

  return (
    <>
      <JsonLd
        data={musicAlbumJsonLd({
          name: album.title,
          url,
          image: album.coverImageUrl,
          description: album.description || undefined,
          byArtist: album.artist.name,
          datePublished: album.releaseDate,
          numTracks: album._count.tracks,
        })}
      />
      <h1 className="sr-only">
        {album.title} by {album.artist.name}
      </h1>
      {children}
    </>
  );
}
