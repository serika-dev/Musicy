import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  buildEntityMetadata,
  musicPlaylistJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: { owner: true, _count: { select: { tracks: true } } },
  });

  if (!playlist) return {};

  const ownerName =
    playlist.owner.displayName || playlist.owner.username || "a Serika Music user";
  const title = `${playlist.name} by ${ownerName} — Playlist on Serika Music`;
  const description =
    playlist.description?.trim() ||
    `Listen to the playlist “${playlist.name}” by ${ownerName} on Serika Music.${
      playlist._count.tracks ? ` ${playlist._count.tracks} tracks.` : ""
    } Curated high-fidelity audio.`;

  return buildEntityMetadata({
    path: `/playlists/${id}`,
    title,
    description:
      description.length > 160
        ? `${description.slice(0, 157).trim()}…`
        : description,
    imageUrl: playlist.coverImageUrl,
    imageAlt: `${playlist.name} playlist on Serika Music`,
    ogType: "music.playlist",
    twitterPlayer: true,
    embedType: "playlists",
    embedId: id,
  });
}

export default async function PlaylistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: { owner: true },
  });

  if (!playlist) return <>{children}</>;

  const ownerName =
    playlist.owner.displayName || playlist.owner.username || "Musicy User";
  const url = absoluteUrl(`/playlists/${id}`);

  return (
    <>
      <JsonLd
        data={musicPlaylistJsonLd({
          name: playlist.name,
          url,
          image: playlist.coverImageUrl,
          description: playlist.description || undefined,
          authorName: ownerName,
        })}
      />
      <h1 className="sr-only">
        {playlist.name} by {ownerName}
      </h1>
      {children}
    </>
  );
}
